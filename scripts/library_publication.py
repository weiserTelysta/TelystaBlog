"""Explicit public selection for a mixed personal archive, shared by offline tools."""

def is_public_book(book, policy):
    excluded = set(policy.get('fileIds', []))
    reviewed_comics = set(policy.get('reviewedComicFileIds', []))
    return book['fileId'] not in excluded and (book['clcCode'] != 'J238' or book['fileId'] in reviewed_comics)
