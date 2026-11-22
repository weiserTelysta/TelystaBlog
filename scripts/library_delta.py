"""Read-only incremental inventory. Keep reports private; never upload or delete files.

Accept a Windows native JSON inventory and rclone SHA256SUMS. Path normalization
only bridges rclone's Windows character encoding, and ambiguous matches fail closed.
"""
import argparse
import json
import os
import re
import unicodedata
from collections import defaultdict
from pathlib import Path, PurePosixPath


def path_key(value):
    value = value.replace('\\', '/')
    path = PurePosixPath(value)
    if not value or path.is_absolute() or '..' in path.parts or re.match(r'^[A-Za-z]:', value):
        raise ValueError('Expected a relative inventory path')
    return unicodedata.normalize('NFKC', value)


def parse_checksums(text):
    result = {}
    for line in text.lstrip('\ufeff').splitlines():
        match = re.fullmatch(r'([a-fA-F0-9]{64})  (.+)', line)
        if not match:
            raise ValueError('Invalid SHA-256 checksum line')
        key = path_key(match[2])
        if key in result:
            raise ValueError('Ambiguous normalized checksum paths')
        result[key] = match[1].lower()
    return result


def catalog_records(value):
    if isinstance(value, list):
        for item in value:
            yield from catalog_records(item)
    elif isinstance(value, dict):
        if str(value.get('id', '')).startswith('WEISER'):
            yield value
        else:
            for item in value.values():
                yield from catalog_records(item)


def prepare_delta(inventory, checksums, existing, known_hashes=None):
    if inventory.get('errors'):
        raise ValueError('Native inventory reported errors')
    groups, paths, short_ids = defaultdict(list), set(), {}
    for item in inventory['files']:
        key = path_key(item['path'])
        if key in paths:
            raise ValueError('Ambiguous normalized inventory paths')
        paths.add(key)
        if key not in checksums:
            raise ValueError('Inventory file has no SHA-256')
        if type(item['bytes']) is not int or item['bytes'] <= 0:
            raise ValueError('Inventory file must have a positive integer size')
        digest = checksums[key]
        identity = 'WEISER' + digest[:12]
        if identity in short_ids and short_ids[identity] != digest:
            raise ValueError('Short ID collision; resolve identities before ingestion')
        if known_hashes and identity in known_hashes and known_hashes[identity] != digest:
            raise ValueError('Existing ID conflicts with full SHA-256 evidence')
        short_ids[identity] = digest
        groups[digest].append({**item, 'sha256': digest, 'id': identity})
    if paths != set(checksums):
        raise ValueError('Checksum scope differs from native inventory')
    added = []
    for digest, rows in groups.items():
        if len({row['bytes'] for row in rows}) != 1:
            raise ValueError('Identical hashes have conflicting file sizes')
        if 'WEISER' + digest[:12] not in existing:
            # Prefer a shelved copy, then a short path. Never alter either source.
            added.append(min(rows, key=lambda row: ('/' not in row['path'], len(row['path']), row['path'])))
    return {
        'baseline': len(existing), 'native': len(paths), 'unique': len(groups),
        'new': sorted(added, key=lambda row: row['path']),
        'missingExisting': sorted(set(existing) - set(short_ids)),
        'duplicates': [rows for rows in groups.values() if len(rows) > 1],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inventory', type=Path, required=True)
    parser.add_argument('--checksums', type=Path, required=True)
    parser.add_argument('--catalog', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--hash-evidence', type=Path, action='append', default=[])
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    if not args.output.resolve().is_relative_to(root / '.tmp'):
        parser.error('Write the private inventory report under the ignored .tmp directory')
    existing = {}
    for path in sorted(args.catalog.glob('[A-Z].json')):
        for record in catalog_records(json.loads(path.read_text())):
            if record['id'] in existing:
                raise ValueError('Duplicate ID in existing catalog')
            existing[record['id']] = record
    evidence = {}
    for path in args.hash_evidence:
        for record in json.loads(path.read_text())['records']:
            if record.get('sha256'):
                identity, digest = record['fileId'], record['sha256']
                if identity in evidence and evidence[identity] != digest:
                    raise ValueError('Conflicting existing hash evidence')
                evidence[identity] = digest
    result = prepare_delta(json.loads(args.inventory.read_text(encoding='utf-8-sig')),
                           parse_checksums(args.checksums.read_text(encoding='utf-8-sig')), existing, evidence)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    descriptor = os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    os.fchmod(descriptor, 0o600)
    with os.fdopen(descriptor, 'w') as stream:
        json.dump(result, stream, ensure_ascii=False, indent=2)
        stream.write('\n')
    print(json.dumps({key: result[key] for key in ('baseline', 'native', 'unique')} | {
        'new': len(result['new']), 'missingExistingPreserved': len(result['missingExisting']),
        'duplicateFilesPreserved': result['native'] - result['unique'],
    }))


if __name__ == '__main__':
    main()
