"""Integrity checks for the optional, standard-library-only import tool.

Run with: python3 -m unittest discover -s tests -p 'library_catalog_test.py'
"""
import importlib.util
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))

spec = importlib.util.spec_from_file_location('library_catalog', Path(__file__).resolve().parents[1] / 'scripts/library-catalog.py')
library = importlib.util.module_from_spec(spec)
spec.loader.exec_module(library)


class LibraryCatalogTests(unittest.TestCase):
    def setUp(self):
        self.digest = 'a' * 64
        self.inventory = {'files': [{'path': 'B/哲学：入门.epub', 'extension': '.epub', 'bytes': 42}], 'errors': []}
        self.rows = [{'所在目录': 'B', '文件名': '哲学：入门.epub', '书名': '哲学入门', '作者': '', '类号': 'B0', '类名': '哲学'}]
        self.checksums = f'{self.digest}  B/哲学:入门.epub\n'
        self.metadata = [{'path': 'B/哲学：入门.epub', 'authors': ['Unknown']}]

    def build(self, **kwargs):
        return library.build_catalog(self.inventory, self.rows, self.checksums, self.metadata, **kwargs)

    def test_windows_punctuation_maps_to_actual_rclone_object_key(self):
        result = self.build()
        self.assertEqual(result['files'][0]['objectKey'], 'books/B/哲学:入门.epub')
        self.assertEqual(result['summary']['rcloneEncodedPaths'], 1)
        self.assertEqual(result['summary']['missingAuthors'], 1)

    def test_ambiguous_normalized_paths_cannot_silently_choose_a_book(self):
        self.checksums += f'{"b" * 64}  B/哲学﹕入门.epub\n'
        with self.assertRaisesRegex(ValueError, 'Ambiguous'):
            self.build()

    def test_scan_errors_or_unlisted_files_cannot_produce_a_complete_catalog(self):
        self.inventory['errors'] = ['unreadable directory']
        with self.assertRaisesRegex(ValueError, 'scan errors'):
            self.build()
        self.inventory['errors'] = []
        self.rows = []
        with self.assertRaisesRegex(ValueError, 'mismatch'):
            self.build()

    def test_duplicate_checksum_records_are_not_overwritten(self):
        self.checksums *= 2
        with self.assertRaisesRegex(ValueError, 'Duplicate checksum'):
            self.build()

    def test_verified_author_and_title_keep_evidence_and_original_catalog_title(self):
        override = {'fileId': 'WEISER' + self.digest[:12], 'sha256': self.digest,
                    'authors': ['作者'], 'status': 'verified', 'verifiedTitle': '正确书名',
                    'sources': [{'kind': 'web', 'url': 'https://example.org/book'}],
                    'contributors': [{'name': '译者', 'role': 'translator'}]}
        result = self.build(author_overrides=[override])
        book = result['files'][0]
        self.assertEqual(book['authors'], ['作者'])
        self.assertEqual(book['title'], '正确书名')
        self.assertEqual(book['catalogTitle'], '哲学入门')
        self.assertEqual(book['authorEvidence'], override['sources'])
        self.assertEqual(book['contributors'], override['contributors'])
        self.assertEqual(result['summary']['missingAuthors'], 0)
        override['sha256'] = 'b' * 64
        with self.assertRaisesRegex(ValueError, 'different edition'):
            self.build(author_overrides=[override])

    def test_partial_collection_remains_explicit(self):
        override = {'fileId': 'WEISER' + self.digest[:12], 'sha256': self.digest,
                    'authors': ['已确认作者'], 'status': 'partial-collection',
                    'sources': [{'kind': 'embedded', 'note': '合集还有其他作者未逐册核验'}]}
        result = self.build(author_overrides=[override])
        self.assertEqual(result['summary']['partialCollections'], [override['fileId']])

    def test_every_catalogued_book_is_public(self):
        # 不再有排除清单：任何已编目书籍（含 J238 漫画）都应进入公开书目。
        self.assertTrue(library.is_public_book({'fileId': 'comic', 'clcCode': 'J238'}))
        self.assertTrue(library.is_public_book({'fileId': 'normal-book', 'clcCode': 'I313'}))
        self.assertTrue(library.is_public_book({'fileId': 'legacy', 'clcCode': 'J238'}, {'fileIds': ['legacy']}))


if __name__ == '__main__':
    unittest.main()
