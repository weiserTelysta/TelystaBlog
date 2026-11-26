import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parse } from 'yaml';
import { readEbookCatalogFiles } from '../src/lib/ebooks/catalogFiles';
import { resolvePostTitle } from '../src/lib/markdownTitle';
// Non-destructive seed from committed Git sources. INSERT OR IGNORE never replaces cloud edits.
const root=process.cwd(),directory=path.join(root,'.tmp/console-import');fs.mkdirSync(directory,{recursive:true});
const publishedPostsOnly=process.argv.includes('--published-posts');
const postRoot='src/content/weiser-posts';
const sourceRoots=publishedPostsOnly?[postRoot]:[postRoot,'src/content/resources','src/content/scores','src/config'];
const records:Array<{id:string;kind:string;title:string;sourcePath:string;source:string;access:string;state:string}>=[];
const paths=execFileSync('git',['ls-tree','-r','-z','--name-only','HEAD',...sourceRoots],{encoding:'utf8'}).split('\0').filter(Boolean);
for(const file of paths){
 if(!/\.(md|ts|jly)$/.test(file))continue;
 const source=execFileSync('git',['show','HEAD:'+file],{encoding:'utf8',maxBuffer:2*1024*1024});
 let kind='',title=path.basename(file),id='',state='published';
 if(file.startsWith('src/config/')){kind='config';id='config_'+createHash('sha256').update(file).digest('hex').slice(0,16);}
 else if(file.endsWith('.jly')){kind='score';id='score_'+createHash('sha256').update(file).digest('hex').slice(0,16);}
 else{
  const match=/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);if(!match)continue;
  const data=parse(match[1]);
  if(file.startsWith('src/content/weiser-posts/')){kind='post';if(!data.uuid)throw new Error('Missing permanent post ID: '+file);id='post_WEISER'+data.uuid;title=resolvePostTitle(source.slice(match[0].length),data.title);}
  else{kind='gallery';id='gallery_'+String(data.id||createHash('sha256').update(file).digest('hex').slice(0,16));title=data.title||title;}
  if(data.draft===true)state='draft';
 }
 if(publishedPostsOnly&&state!=='published')continue;
 records.push({id,kind,title,sourcePath:file,source,access:'public',state});
}
if(!publishedPostsOnly){
 const approved=new Set<string>(JSON.parse(fs.readFileSync(path.join(root,'.tmp/library-gateway/release-ids.json'),'utf8')));
 const full=JSON.parse(fs.readFileSync(path.join(root,'.tmp/library-gateway/catalog.json'),'utf8')) as Array<Record<string,unknown>&{id:string;title:string;access:string}>;
 const pathsById=new Map(readEbookCatalogFiles(root).flatMap(file=>file.books.map(book=>[book.id,path.relative(root,file.filePath)+'#'+book.id] as const)));
 for(const book of full){if(!approved.has(book.id))throw new Error('Unreviewed book in seed');records.push({id:'ebook_'+book.id,kind:'ebook',title:book.title,sourcePath:pathsById.get(book.id)!,source:JSON.stringify(book,null,2),access:book.access,state:'published'});}
}
const quote=(value:string)=>"'"+value.replaceAll("'","''")+"'",now=Math.floor(Date.now()/1000);
const sql=[`INSERT OR IGNORE INTO users(id,email,role,status,created_at,updated_at) VALUES(${quote(randomUUID())},'weiser@telysta.com','admin','active',${now},${now});`];
for(const record of records){
 if(record.source.includes('\0'))throw new Error('Unexpected null byte');
 sql.push(`INSERT OR IGNORE INTO documents(id,kind,title,source_path,source,owner_id,access,state,updated_at,imported_at,base_hash) VALUES(${[record.id,record.kind,record.title,record.sourcePath,record.source].map(quote).join(',')},(SELECT id FROM users WHERE email='weiser@telysta.com'),${quote(record.access)},${quote(record.state)},${now},${now},${quote(createHash('sha256').update(record.source).digest('hex'))});`);
}
const output=publishedPostsOnly?'published-posts':'seed';
fs.writeFileSync(path.join(directory,output+'.sql'),sql.join('\n')+'\n',{mode:0o600});
const summary={git:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),documents:records.length,byKind:Object.fromEntries([...new Set(records.map(row=>row.kind))].map(kind=>[kind,records.filter(row=>row.kind===kind).length]))};
fs.writeFileSync(path.join(directory,publishedPostsOnly?'published-posts.json':'manifest.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
