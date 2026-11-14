"""Metadata/cover extraction regressions; standard library tests need no PDF tools."""
import importlib.util
import sys
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))

spec = importlib.util.spec_from_file_location('library_preparation', Path(__file__).resolve().parents[1] / 'scripts/prepare-library-books.py')
preparation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preparation)


class PreparationTests(unittest.TestCase):
    def test_public_paths_encode_reserved_characters_and_preserve_saved_file_identity(self):
        book = {'fileId': 'WEISER012345abcdef', 'title': '书名', 'authors': ['作者'], 'authorStatus': 'verified', 'clcCode': 'B0', 'clcName': '哲学', 'format': 'EPUB', 'bytes': 42, 'objectKey': 'books/B/书名:问号?#.epub'}
        record = preparation.web_record(book, 'https://library-files.telysta.com', None)
        self.assertEqual(record['id'], book['fileId'])
        self.assertIn('%3A', record['files'][0]['href'])
        self.assertIn('%3F%23.epub', record['files'][0]['href'])
        self.assertNotIn('cover', record)
        book['catalogTitle'] = '错误旧标题'
        book['embeddedTitle'] = '旧标题'
        self.assertEqual(preparation.web_record(book, 'https://library-files.telysta.com', None)['title'], '书名')

    def test_epub3_cover_uses_declared_item_and_resolves_relative_path(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / 'book.epub'
            with zipfile.ZipFile(path, 'w') as z:
                z.writestr('META-INF/container.xml', '<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>')
                z.writestr('OEBPS/content.opf', '<package xmlns="http://www.idpf.org/2007/opf"><manifest><item id="cover" href="../Images/封面.jpg" media-type="image/jpeg" properties="cover-image"/></manifest></package>')
                z.writestr('Images/封面.jpg', b'original-cover-bytes')
            self.assertEqual(preparation.epub_cover(path), b'original-cover-bytes')


if __name__ == '__main__':
    unittest.main()
