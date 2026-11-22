import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from library_delta import parse_checksums, prepare_delta


class DeltaTests(unittest.TestCase):
    def test_exact_duplicates_prefer_shelved_copy_and_preserve_old_catalog(self):
        digest = 'a' * 64
        rows = [{'path': path, 'bytes': 10} for path in ['book.pdf', 'K/book.pdf']]
        result = prepare_delta({'files': rows}, {r['path']: digest for r in rows}, {'WEISERold': {}})
        self.assertEqual(result['new'][0]['path'], 'K/book.pdf')
        self.assertEqual(result['missingExisting'], ['WEISERold'])
        self.assertEqual(len(result['duplicates'][0]), 2)
        self.assertEqual(len(rows), 2)

    def test_same_name_and_size_are_not_duplicate_evidence(self):
        rows = [{'path': path, 'bytes': 10} for path in ['A/book.pdf', 'B/book.pdf']]
        result = prepare_delta({'files': rows}, {'A/book.pdf': 'a'*64, 'B/book.pdf': 'b'*64}, {})
        self.assertEqual(len(result['new']), 2)

    def test_rclone_full_width_path_can_match_native_inventory(self):
        sums = parse_checksums('a'*64 + '  K/book:1.pdf\n')
        result = prepare_delta({'files': [{'path': 'K/book：1.pdf', 'bytes': 10}]}, sums, {})
        self.assertEqual(result['new'][0]['path'], 'K/book：1.pdf')

    def test_normalized_checksum_collisions_fail_even_if_hashes_match(self):
        with self.assertRaisesRegex(ValueError, 'Ambiguous'):
            parse_checksums('a'*64 + '  book:1.pdf\n' + 'a'*64 + '  book：1.pdf')

    def test_short_hash_collision_fails(self):
        rows = [{'path': p, 'bytes': 10} for p in ['one.pdf', 'two.pdf']]
        with self.assertRaisesRegex(ValueError, 'collision'):
            prepare_delta({'files': rows}, {'one.pdf': 'a'*64, 'two.pdf': 'a'*12+'b'*52}, {})

    def test_existing_full_hash_collision_fails(self):
        with self.assertRaisesRegex(ValueError, 'full SHA'):
            prepare_delta({'files': [{'path': 'a.pdf', 'bytes': 10}]}, {'a.pdf': 'a'*64},
                          {'WEISER'+'a'*12: {}}, {'WEISER'+'a'*12: 'a'*12+'b'*52})

    def test_scope_mismatch_and_inventory_errors_fail(self):
        with self.assertRaisesRegex(ValueError, 'scope'):
            prepare_delta({'files': []}, {'unexpected.pdf': 'a'*64}, {})
        with self.assertRaisesRegex(ValueError, 'errors'):
            prepare_delta({'files': [], 'errors': ['unreadable']}, {}, {})

    def test_traversal_and_invalid_sizes_fail(self):
        with self.assertRaisesRegex(ValueError, 'relative'):
            parse_checksums('a'*64 + '  ../outside.pdf')
        with self.assertRaisesRegex(ValueError, 'positive'):
            prepare_delta({'files': [{'path': 'a.pdf', 'bytes': 0}]}, {'a.pdf': 'a'*64}, {})


if __name__ == '__main__':
    unittest.main()
