"""Build a verified, portable library catalog without changing the source books.

Uses a Windows-native inventory because WSL/DrvFS can silently omit directories.
Rclone SHA-256 paths are its virtual paths, which can differ from Windows names.
"""
import argparse
import csv
import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from library_publication import is_public_book

FORMATS = {'.epub', '.pdf', '.mobi', '.azw3'}
CLC_CLASSES = {
    'A': '马克思主义、列宁主义、毛泽东思想、邓小平理论', 'B': '哲学、宗教',
    'C': '社会科学总论', 'D': '政治、法律', 'E': '军事', 'F': '经济',
    'G': '文化、科学、教育、体育', 'H': '语言、文字', 'I': '文学', 'J': '艺术',
    'K': '历史、地理', 'N': '自然科学总论', 'O': '数理科学和化学',
    'P': '天文学、地球科学', 'Q': '生物科学', 'R': '医药、卫生', 'S': '农业科学',
    'T': '工业技术', 'U': '交通运输', 'V': '航空、航天',
    'X': '环境科学、安全科学', 'Z': '综合性图书',
}


def relative_path(value):
    return value.replace('\\', '/').replace('//', '/')


def build_catalog(inventory, rows, checksum_text, metadata=(), author_overrides=()):
    if inventory.get('errors'):
        raise ValueError('Native inventory has scan errors; refusing an incomplete catalog')
    files = {relative_path(f['path']): f for f in inventory['files'] if f['extension'].lower() in FORMATS}
    source_rows = {}
    for row in rows:
        key = relative_path(row['所在目录'] + '/' + row['文件名'])
        if key in source_rows:
            raise ValueError(f'Duplicate catalog path: {key}')
        source_rows[key] = row
    if files.keys() != source_rows.keys():
        raise ValueError(f'Inventory/catalog mismatch: missing={len(source_rows.keys()-files.keys())}, unlisted={len(files.keys()-source_rows.keys())}')
    hashes = {}
    for line in checksum_text.splitlines():
        match = re.fullmatch(r'([0-9a-fA-F]{64})\s{2}(.*)', line)
        if not match:
            if line.strip():
                raise ValueError('Invalid SHA256SUMS line')
            continue
        key = relative_path(match[2])
        if key in hashes:
            raise ValueError(f'Duplicate checksum path: {key}')
        hashes[key] = match[1].lower()
    normalized = defaultdict(list)
    for key in hashes:
        normalized[unicodedata.normalize('NFKC', key)].append(key)
    meta = {relative_path(m['path']): m for m in metadata}
    overrides = {}
    for override in author_overrides:
        key = override['fileId']
        if key in overrides:
            raise ValueError(f'Duplicate author override: {key}')
        if not override.get('sources') or not override.get('authors'):
            raise ValueError(f'Author override needs attribution and evidence: {key}')
        if override.get('status') not in {'verified', 'anonymous', 'partial-collection'}:
            raise ValueError(f'Invalid author status: {key}')
        overrides[key] = override
    records, matched, identities, used_overrides = [], set(), {}, set()
    for source, file in sorted(files.items()):
        candidates = [source] if source in hashes else normalized[unicodedata.normalize('NFKC', source)]
        if len(candidates) != 1 or candidates[0] in matched:
            raise ValueError(f'Ambiguous or missing rclone path: {source}')
        virtual = candidates[0]
        matched.add(virtual)
        digest = hashes[virtual]
        identity = 'WEISER' + digest[:12]
        if identity in identities and identities[identity] != digest:
            raise ValueError('Short file ID collision')
        identities[identity] = digest
        row, epub = source_rows[source], meta.get(source, {})
        author = row['作者'].strip()
        epub_authors = [a for a in epub.get('authors', []) if a and a.lower() not in {'unknown', 'none', 'n/a'}]
        authors = [author] if author else epub_authors
        record = {
            'fileId': identity, 'title': row['书名'].strip() or Path(source).stem,
            'authors': authors, 'authorSource': 'catalog' if author else 'epub' if authors else 'missing',
            'authorStatus': 'unreviewed' if authors else 'missing',
            'format': file['extension'].lstrip('.').upper(), 'bytes': int(file['bytes']),
            'sha256': digest, 'clcCode': row['类号'].strip(), 'clcName': row['类名'].strip(),
            'sourceRelativePath': source, 'objectKey': 'books/' + virtual,
            'originalFilename': Path(source).name,
            'language': epub.get('language', ''), 'publisher': epub.get('publisher', ''),
            'embeddedTitle': epub.get('title', ''),
        }
        if identity in overrides:
            override = overrides[identity]
            if override['sha256'] != digest:
                raise ValueError(f'Author override belongs to a different edition/file: {identity}')
            record.update(authors=override['authors'], authorSource='verified',
                          authorStatus=override['status'], authorEvidence=override['sources'],
                          contributors=override.get('contributors', []))
            if override.get('verifiedTitle'):
                record['catalogTitle'] = record['title']
                record['title'] = override['verifiedTitle']
            for field in ['clcCode', 'clcName']:
                if override.get(field):
                    record[field] = override[field]
            used_overrides.add(identity)
        records.append(record)
    if matched != hashes.keys():
        raise ValueError('Checksum manifest contains unmatched paths')
    if overrides.keys() != used_overrides:
        raise ValueError('Author overrides contain files absent from this inventory')
    summary = summarize_records(records, [{'path': m['path'], 'error': m['error']} for m in metadata if m.get('error')])
    return {'version': 1, 'bucket': 'telysta-library', 'generatedAt': datetime.now(timezone.utc).isoformat(), 'summary': summary, 'files': records}


def summarize_records(records, metadata_errors=None):
    content_counts = Counter(record['sha256'] for record in records)
    summary = {
        'fileCount': len(records), 'bytes': sum(r['bytes'] for r in records),
        'formats': dict(Counter(r['format'] for r in records)),
        'uniqueContents': len(content_counts),
        'exactDuplicateGroups': sum(n > 1 for n in content_counts.values()),
        'topClasses': dict(sorted(Counter(r['clcCode'][:1] for r in records).items())),
        'leafClasses': len({r['clcCode'] for r in records}),
        'missingAuthors': sum(not r['authors'] for r in records),
        'authorSources': dict(Counter(r['authorSource'] for r in records)),
        'anonymousWorks': sum(r['authorStatus'] == 'anonymous' for r in records),
        'partialCollections': [r['fileId'] for r in records if r['authorStatus'] == 'partial-collection'],
        'rcloneEncodedPaths': sum(r['sourceRelativePath'] != r['objectKey'][6:] for r in records),
        'metadataErrors': metadata_errors or [],
        'unknownClcCodes': sorted({r['clcCode'] for r in records if r['clcCode'][:1] not in CLC_CLASSES}),
    }
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inventory', type=Path, required=True)
    parser.add_argument('--catalog', type=Path, required=True)
    parser.add_argument('--checksums', type=Path, required=True)
    parser.add_argument('--epub-metadata', type=Path)
    parser.add_argument('--author-overrides', type=Path, help='Reviewed author records with SHA-256 and evidence')
    parser.add_argument('--public-only', action='store_true', help='Write only the explicitly reviewed public selection')
    parser.add_argument('--publication-policy', type=Path, default=Path(__file__).resolve().parents[1] / 'data/library/publication-exclusions.json')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    with args.catalog.open(encoding='utf-8-sig', newline='') as source:
        rows = list(csv.DictReader(source))
    metadata = json.loads(args.epub_metadata.read_text(encoding='utf-8-sig')) if args.epub_metadata else []
    overrides = json.loads(args.author_overrides.read_text(encoding='utf-8'))['records'] if args.author_overrides else []
    catalog = build_catalog(json.loads(args.inventory.read_text(encoding='utf-8-sig')), rows, args.checksums.read_text(encoding='utf-8-sig'), metadata, overrides)
    if args.public_only:
        policy = json.loads(args.publication_policy.read_text())
        total = len(catalog['files'])
        catalog['files'] = [book for book in catalog['files'] if is_public_book(book, policy)]
        catalog['summary'] = summarize_records(catalog['files'])
        catalog['summary']['sourceLibraryFileCount'] = total
        catalog['summary']['withheldFileCount'] = total - len(catalog['files'])
    args.output.mkdir(parents=True, exist_ok=True)
    data = (json.dumps(catalog, ensure_ascii=False, indent=2) + '\n').encode()
    (args.output / 'catalog.json').write_bytes(data)
    (args.output / 'catalog.sha256').write_text(hashlib.sha256(data).hexdigest() + '  catalog.json\n')
    (args.output / 'SHA256SUMS').write_text(''.join(f"{r['sha256']}  {r['objectKey']}\n" for r in catalog['files']))
    (args.output / 'upload-files.txt').write_text(''.join(r['objectKey'][6:] + '\n' for r in catalog['files']), encoding='utf-8')
    columns = ['fileId', 'title', 'authors', 'authorSource', 'authorStatus', 'format', 'bytes', 'clcCode', 'clcName', 'objectKey', 'sha256']
    with (args.output / 'catalog.csv').open('w', encoding='utf-8-sig', newline='') as target:
        writer = csv.DictWriter(target, fieldnames=columns)
        writer.writeheader()
        writer.writerows({key: '、'.join(r[key]) if key == 'authors' else r[key] for key in columns} for r in catalog['files'])
    source_index = {relative_path(row['所在目录'] + '/' + row['文件名']): row for row in rows}
    chinese_columns = list(rows[0]) + ['作者来源', '作者核验状态', '作者出处', '文件编号', 'SHA256'] if rows else []
    with (args.output / '书名目录-补全作者.csv').open('w', encoding='utf-8-sig', newline='') as target:
        writer = csv.DictWriter(target, fieldnames=chinese_columns)
        writer.writeheader()
        for record in catalog['files']:
            original = source_index[record['sourceRelativePath']]
            evidence = record.get('authorEvidence', [])
            writer.writerow({**original, '书名': record['title'], '作者': '、'.join(record['authors']), '类号': record['clcCode'], '类名': record['clcName'],
                             '作者来源': record['authorSource'], '作者核验状态': record['authorStatus'],
                             '作者出处': ' | '.join(s.get('url', s.get('note', '')) for s in evidence),
                             '文件编号': record['fileId'], 'SHA256': record['sha256']})
    print(json.dumps(catalog['summary'], ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
