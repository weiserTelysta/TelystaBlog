"""Prepare website metadata and small covers from an audited local catalog.

Offline only: pip install pillow pymupdf. Never changes original book files.
"""
import argparse
import concurrent.futures
import hashlib
import io
import json
import posixpath
import re
import struct
import urllib.parse
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from library_publication import is_public_book


def epub_cover(path):
    with zipfile.ZipFile(path) as archive:
        container = ET.fromstring(archive.read('META-INF/container.xml'))
        opf_path = next(n.attrib['full-path'] for n in container.iter() if n.tag.endswith('rootfile'))
        package = ET.fromstring(archive.read(opf_path))
        items = [n for n in package.iter() if n.tag.endswith('}item') or n.tag == 'item']
        cover_id = next((n.attrib.get('content') for n in package.iter() if n.attrib.get('name') == 'cover'), None)
        item = next((n for n in items if 'cover-image' in n.attrib.get('properties', '').split()), None)
        if item is None:
            item = next((n for n in items if n.attrib.get('id') == cover_id), None)
        if item is None:
            item = next((n for n in items if 'cover' in n.attrib.get('id', '').lower() and n.attrib.get('media-type', '').startswith('image/')), None)
        if item is None:
            return None
        name = posixpath.normpath(posixpath.join(posixpath.dirname(opf_path), urllib.parse.unquote(item.attrib['href'])))
        if archive.getinfo(name).file_size > 30 * 1024 * 1024:
            raise ValueError('Cover exceeds 30 MiB')
        return archive.read(name)


def kindle_cover(path):
    # MOBI record 0: first image index at 0x6c; EXTH 201 is its cover offset.
    # Read metadata and the declared image only; no text decompression or decryption.
    with path.open('rb') as stream:
        header = stream.read(78)
        if len(header) < 78 or header[60:68] != b'BOOKMOBI':
            return None
        count = struct.unpack_from('>H', header, 76)[0]
        table = stream.read(count * 8)
        offsets = [struct.unpack_from('>L', table, i * 8)[0] for i in range(count)]
        if count < 2:
            return None
        stream.seek(offsets[0])
        record = stream.read(min(offsets[1] - offsets[0], 4 * 1024 * 1024))
        if len(record) < 112:
            return None
        first_image = struct.unpack_from('>L', record, 0x6c)[0]
        start = record.find(b'EXTH')
        if start < 0:
            return None
        entries = struct.unpack_from('>L', record, start + 8)[0]
        cursor, cover_offset = start + 12, None
        for _ in range(entries):
            if cursor + 8 > len(record):
                break
            kind, size = struct.unpack_from('>LL', record, cursor)
            if size < 8 or cursor + size > len(record):
                break
            if kind == 201 and size == 12:
                cover_offset = struct.unpack_from('>L', record, cursor + 8)[0]
                break
            cursor += size
        if cover_offset is None or first_image + cover_offset >= count:
            return None
        number = first_image + cover_offset
        end = offsets[number + 1] if number + 1 < count else path.stat().st_size
        if end - offsets[number] > 30 * 1024 * 1024:
            raise ValueError('Cover exceeds 30 MiB')
        stream.seek(offsets[number])
        return stream.read(end - offsets[number])


def prepare_cover(book, source, covers, source_overrides=None):
    from PIL import Image, ImageOps
    path = Path((source_overrides or {}).get(book['fileId'], source / book['sourceRelativePath']))
    if book['format'] == 'PDF':
        import pymupdf
        with pymupdf.open(path) as pdf:
            if pdf.needs_pass or not len(pdf):
                return None
            image = None
            for number in range(min(3, len(pdf))):
                page = pdf[number]
                scale = min(320 / page.rect.width, 480 / page.rect.height)
                pixmap = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
                image = Image.open(io.BytesIO(pixmap.tobytes('png'))).convert('RGB')
                # Skip truly blank front sheets; keep title-only pages as supplied.
                dark = image.convert('L').point(lambda value: 255 if value < 235 else 0).histogram()[255]
                if dark / (image.width * image.height) > .002:
                    break
    else:
        data = epub_cover(path) if book['format'] == 'EPUB' else kindle_cover(path)
        if not data:
            return None
        image = ImageOps.exif_transpose(Image.open(io.BytesIO(data)))
        if image.mode not in ('RGB', 'RGBA'):
            image = image.convert('RGB')
    image.thumbnail((320, 480))
    buffer = io.BytesIO()
    image.save(buffer, format='WEBP', quality=82, method=4)
    data = buffer.getvalue()
    name = hashlib.sha256(data).hexdigest() + '.webp'
    target = covers / name
    if not target.exists():
        target.write_bytes(data)
    return name


def web_record(book, origin, cover):
    title = book['title']
    embedded = book.get('embeddedTitle', '').strip()
    if 'catalogTitle' not in book and embedded and len(embedded) <= len(title):
        title = embedded
    # Remove long seller blurbs, retaining edition/volume text in short titles.
    if len(title) > 70 and '（' in title:
        title = title.split('（', 1)[0].strip()
    authors = book['authors']
    translator = '、'.join(p['name'] for p in book.get('contributors', []) if p['role'] == 'translator')
    record = {
        'id': book['fileId'], 'title': title, 'authors': authors,
        'authorStatus': book['authorStatus'],
        'clcCode': book['clcCode'], 'clcName': book['clcName'],
        'description': f"《{title}》；{'、'.join(authors)}。{book['clcName']}，{book['format']} 格式。",
        'files': [{'format': book['format'], 'href': origin + '/' + urllib.parse.quote(book['objectKey'], safe='/'), 'bytes': book['bytes']}],
        'draft': False,
        'access': book.get('access', 'public'),
    }
    if cover:
        record['cover'] = origin + '/covers/' + cover
    if book.get('categoryOnly'):
        record['categoryOnly'] = True
    if translator:
        record['translator'] = translator
    for key in ['language', 'publisher']:
        if book.get(key):
            record[key] = book[key]
    return record


def grouped_catalog(category, records):
    """Keep fine CLC codes on their Booklist, with books inheriting that class."""
    groups = {}
    for record in records:
        code, name = record['clcCode'], record['clcName']
        if not code.startswith(category):
            raise ValueError('Booklist code does not belong to its category')
        group = groups.setdefault(code, {'clcCode': code, 'clcName': name, 'books': []})
        item = {key: value for key, value in record.items() if key != 'clcCode'}
        if item.get('clcName') == group['clcName']:
            item.pop('clcName', None)
        group['books'].append(item)
    return {'category': category, 'booklists': [groups[code] for code in sorted(groups)]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--catalog', type=Path, required=True)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--covers', type=Path, required=True)
    parser.add_argument('--content', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--source-overrides', type=Path, help='Temporary local copies for paths inaccessible through WSL')
    parser.add_argument('--exclusions', type=Path, default=Path(__file__).resolve().parents[1] / 'data/library/publication-exclusions.json')
    parser.add_argument('--origin', default='https://library-files.telysta.com')
    parser.add_argument('--presentation-overrides', type=Path, default=Path(__file__).resolve().parents[1] / 'data/library/presentation-overrides.json')
    args = parser.parse_args()
    books = json.loads(args.catalog.read_text())['files']
    policy = json.loads(args.exclusions.read_text()) if args.exclusions and args.exclusions.exists() else {}
    books = [book for book in books if is_public_book(book, policy)]
    presentation = {item['fileId']: item for item in json.loads(args.presentation_overrides.read_text())['records']}
    books = [{**book, 'categoryOnly': presentation.get(book['fileId'], {}).get('categoryOnly', book.get('categoryOnly', False))} for book in books]
    source_overrides = json.loads(args.source_overrides.read_text()) if args.source_overrides else {}
    args.covers.mkdir(parents=True, exist_ok=True)
    args.content.mkdir(parents=True, exist_ok=True)
    records, errors, missing = [], [], []
    def prepare(book):
        try:
            cover = prepare_cover(book, args.source, args.covers, source_overrides)
            return book, cover, None
        except Exception as error:
            return book, None, f'{type(error).__name__}: {error}'
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for book, cover, error in pool.map(prepare, books):
            if not cover:
                missing.append(book['fileId'])
            if error:
                errors.append({'id': book['fileId'], 'error': error})
            record = web_record(book, args.origin.rstrip('/'), cover)
            records.append(record)
    # This is a reviewed staging batch, never overwrite the live class catalogs.
    live = Path(__file__).resolve().parents[1] / 'src/content/ebooks/catalog'
    if args.content.resolve() == live.resolve():
        raise ValueError('Prepare into a temporary batch directory, then merge reviewed entries into the live JSON catalogs')
    categories = {}
    for record in records:
        categories.setdefault(record['clcCode'][0], []).append(record)
    for category, entries in categories.items():
        target = args.content / (category + '.json')
        target.write_text(json.dumps(grouped_catalog(category, entries), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        if any(record['access'] == 'protected' for record in entries):
            target.chmod(0o600)
    args.report.write_text(json.dumps({'files': len(records), 'withCover': len(records) - len(missing), 'withoutCover': missing, 'coverErrors': errors}, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'files':len(records),'covers':len(records)-len(missing),'coverErrors':len(errors)},ensure_ascii=False))


if __name__ == '__main__':
    main()
