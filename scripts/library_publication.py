"""Public-selection helper shared by the offline library tools."""


def is_public_book(book, policy=None):
    """Every catalogued book is public; kept for callers that pass a policy."""
    return True
