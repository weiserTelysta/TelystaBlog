import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixture.mjs';
const id='post_WEISER012345abcdef';
test('文章字段编辑以正文H1为标题，保留未知元信息并防止陈旧版本覆盖',async t=>{
 const f=await fixture(t),owner=await f.login('weiser@telysta.com');const source='---\nuuid: 012345abcdef\ntitle: Meta\ncategory: notes\ncustom: keep\n---\n\n```md\n# Not a title\n```\n\n# Actual title\n\nOriginal';
 await f.db.prepare("INSERT INTO documents(id,kind,title,source,updated_at,imported_at) VALUES(?1,'post','Meta',?2,0,0)").bind(id,source).run();const path='/api/documents/'+id+'/editor';const view=await(await f.request(path,'GET',undefined,owner.cookie)).json();assert.equal(view.editor.fields.title,'Actual title');assert.ok(view.editor.body.includes('# Not a title'));assert.ok(!view.editor.body.includes('# Actual title'));
 const patch={fields:{title:'Edited title',category:'notes'},body:'New body',revision:1,access:'public'};assert.equal((await f.request(path,'PATCH',patch,owner.cookie)).status,200);assert.equal((await f.request(path,'PATCH',patch,owner.cookie)).status,409);
 const record=await f.db.prepare('SELECT source,revision FROM documents WHERE id=?1').bind(id).first();assert.ok(record.source.includes('custom: keep'));assert.ok(record.source.includes('# Edited title'));assert.equal(record.revision,2);
 assert.equal((await f.request(path,'PATCH',{...patch,revision:2,fields:{uuid:'changed'}},owner.cookie)).status,400);
});
test('具名设置只修改允许的字面量，拒绝原型路径、危险链接和固定编号变更',async t=>{
 const f=await fixture(t),owner=await f.login('weiser@telysta.com'),id='config_fixture';const source='const keep=()=>42;\nexport const HOME_SECTIONS=[{id:"about",title:"见我",href:"/about/"}];export const HOME_ARCHIVE_INTRO="Intro";export const HOME_SOCIAL_LINKS=[];export const HOME_QR_CONTACTS=[];';
 await f.db.prepare("INSERT INTO documents(id,kind,title,source_path,source,updated_at,imported_at) VALUES(?1,'config','home.ts','src/config/pages/home.ts',?2,0,0)").bind(id,source).run();const path='/api/documents/'+id+'/editor';
 const attempt=patches=>f.request(path,'PATCH',{section:'HOME_SECTIONS',patches,revision:1},owner.cookie);
 for(const patches of [[{path:[0,'id'],value:'x'}],[{path:['__proto__','x'],value:'x'}],[{path:[0,'href'],value:'javascript:alert(1)'}]])assert.equal((await attempt(patches)).status,400);
 const response=await attempt([{path:[0,'title'],value:'更新'}]);assert.equal(response.status,200,await response.clone().text());const record=await f.db.prepare('SELECT source FROM documents WHERE id=?1').bind(id).first();assert.ok(record.source.includes('const keep=()=>42;'));assert.ok(record.source.includes('id:"about"'));assert.ok(record.source.includes('title:"更新"'));
});
test('书籍嵌套附件禁止未授权文件域、危险格式和零大小，固定书籍身份保留',async t=>{
 const f=await fixture(t),owner=await f.login('weiser@telysta.com'),id='ebook_WEISER012345abcdef';const source=JSON.stringify({id:'WEISER012345abcdef',title:'Book',authors:['Author'],files:[],custom:'keep'});
 await f.db.prepare("INSERT INTO documents(id,kind,title,source,updated_at,imported_at) VALUES(?1,'ebook','Book',?2,0,0)").bind(id,source).run();const path='/api/documents/'+id+'/editor';
 for(const file of [{format:'EXE',href:'https://library-files.telysta.com/books/x.exe'},{format:'EPUB',href:'https://evil.example/x.epub'},{format:'PDF',href:'https://library-files.telysta.com/books/x.pdf',bytes:0}])assert.equal((await f.request(path,'PATCH',{fields:{title:'Book',files:[file]},revision:1},owner.cookie)).status,400);
 const changed=await f.request(path,'PATCH',{fields:{title:'Updated',authors:['Author']},revision:1,access:'protected'},owner.cookie);assert.equal(changed.status,200,await changed.clone().text());const value=JSON.parse((await f.db.prepare('SELECT source FROM documents WHERE id=?1').bind(id).first()).source);assert.equal(value.id,'WEISER012345abcdef');assert.equal(value.custom,'keep');assert.equal(value.access,'protected');
});
