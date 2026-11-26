import { audit } from './auth';

type Table = { key: string; from: string; columns: string; where?: string; bind?: string };

/** Page through rows instead of buffering the whole source history in Worker memory. */
export async function exportBackup(env: ConsoleEnv, actor: string, type: string, kinds: readonly string[]) {
 const tables: Table[] = [];
 if (type === 'all' || kinds.includes(type)) {
  tables.push({key:'documents',from:'documents t',columns:'t.*',where:type==='all'?undefined:'t.kind=?3',bind:type==='all'?undefined:type});
  tables.push({key:'revisions',from:'document_revisions t',columns:'t.*',where:type==='all'?undefined:'EXISTS(SELECT 1 FROM documents d WHERE d.id=t.document_id AND d.kind=?3)',bind:type==='all'?undefined:type});
 }
 if(type==='all'||type==='post')tables.push({key:'postPublicationSnapshots',from:'post_publication_snapshots t',columns:'t.*'});
 if(type==='all'||type==='comments'||['post','ebook'].includes(type))tables.push({key:'comments',from:'comments t',columns:'t.*',where:['post','ebook'].includes(type)?'EXISTS(SELECT 1 FROM documents d WHERE d.id=t.document_id AND d.kind=?3)':undefined,bind:['post','ebook'].includes(type)?type:undefined});
 if(type==='all'||type==='users')tables.push({key:'users',from:'users t',columns:'t.id,t.email,t.username,t.display_name,t.role,t.status,t.restricted_access,t.email_verified_at,t.created_at,t.updated_at'});
 if(type==='all'||type==='uploads')tables.push({key:'uploads',from:'uploads t',columns:'t.*'});
 if(type==='all'||type==='audit')tables.push({key:'audit',from:'audit_events t',columns:'t.*'});
 await audit(env,actor,'backup.'+type);
 // Bound each table before streaming so new inserts cannot make an export run indefinitely.
 const bounds=await env.DB.batch<{last:number}>(tables.map(table=>env.DB.prepare(`SELECT coalesce(max(t.rowid),0) AS last FROM ${table.from}`)));
 async function* chunks() {
  yield JSON.stringify({version:1,type,exportedAt:new Date().toISOString(),consistency:'live',binaryFilesIncluded:false}).slice(0,-1);
  for(let i=0;i<tables.length;i++){
   const table=tables[i],last=Number(bounds[i].results[0].last);let cursor=0,first=true;
   yield `,${JSON.stringify(table.key)}:[`;
   while(cursor<last){
    const query=env.DB.prepare(`SELECT t.rowid AS _cursor,${table.columns} FROM ${table.from} WHERE t.rowid>?1 AND t.rowid<=?2${table.where?' AND '+table.where:''} ORDER BY t.rowid LIMIT 10`);
    const page=await query.bind(...(table.bind?[cursor,last,table.bind]:[cursor,last])).all<Record<string,unknown>&{_cursor:number}>();
    if(!page.results.length)break;
    for(const {_cursor,...record}of page.results){cursor=_cursor;yield (first?'':',')+JSON.stringify(record);first=false;}
   }
   yield ']';
  }
  yield ',"completed":true}';
 }
 const iterator=chunks(),encoder=new TextEncoder();
 return new Response(new ReadableStream<Uint8Array>({
  async pull(controller){try{const next=await iterator.next();if(next.done)controller.close();else controller.enqueue(encoder.encode(next.value));}catch(error){controller.error(error);}},
  async cancel(){await iterator.return(undefined);},
 }),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','Content-Disposition':`attachment; filename="telysta-${type}-backup.json"`}});
}
