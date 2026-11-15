import { readEbookCatalogFiles } from '../src/lib/ebooks/catalogFiles';
const catalogs=readEbookCatalogFiles(process.cwd()),books=catalogs.flatMap(file=>file.books);
const published=books.filter(book=>book.draft===false),publicBooks=published.filter(book=>book.access!=='protected');
console.log(JSON.stringify({sourceRecords:books.length,drafts:books.length-published.length,published:published.length,public:publicBooks.length,protected:published.length-publicBooks.length,categoryFiles:catalogs.length,booklists:new Set(books.map(book=>book.clcCode)).size},null,2));
