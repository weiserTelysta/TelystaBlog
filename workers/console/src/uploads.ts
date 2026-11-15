import { HttpError, body, json } from './http';
import { audit, nowSeconds } from './auth';
import { can, type User } from './permissions';
type Upload = { id: string; owner_id: string; kind: 'ebook'|'image'; filename: string; object_key: string; content_type: string; bytes: number; state: string; metadata: string };
const types: Record<string, { kind: 'ebook'|'image'; mime: string }> = { pdf: { kind:'ebook',mime:'application/pdf' }, epub:{kind:'ebook',mime:'application/epub+zip'}, mobi:{kind:'ebook',mime:'application/x-mobipocket-ebook'}, azw3:{kind:'ebook',mime:'application/vnd.amazon.ebook'}, png:{kind:'image',mime:'image/png'}, jpg:{kind:'image',mime:'image/jpeg'}, jpeg:{kind:'image',mime:'image/jpeg'}, webp:{kind:'image',mime:'image/webp'} };
function signature(extension: string, bytes: Uint8Array) {
 const text = new TextDecoder('latin1').decode(bytes.slice(0,80));
 if (extension === 'pdf') return text.startsWith('%PDF-');
 if (extension === 'epub') return bytes[0]===0x50 && bytes[1]===0x4b;
 if (extension === 'mobi' || extension === 'azw3') return text.slice(60,68)==='BOOKMOBI';
 if (extension==='png') return bytes[0]===137 && text.slice(1,4)==='PNG';
 if (extension==='jpg'||extension==='jpeg') return bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
 return text.startsWith('RIFF') && text.slice(8,12)==='WEBP';
}
export async function handleUploads(request: Request, env: ConsoleEnv, user: User, url: URL) {
 if (!can(user,'own:write')) throw new HttpError(403,'正式用户才能上传和管理资源。');
 const moderator = can(user,'content:review'), now=nowSeconds();
 if (url.pathname==='/api/uploads' && request.method==='GET') {
  const result = moderator ? await env.DB.prepare('SELECT id,owner_id,filename,bytes,state,review_state,metadata FROM uploads WHERE state=\'ready\' ORDER BY created_at DESC LIMIT 100').all() : await env.DB.prepare('SELECT id,owner_id,filename,bytes,state,review_state,metadata FROM uploads WHERE owner_id=?1 AND state=\'ready\' ORDER BY created_at DESC LIMIT 100').bind(user.id).all();
  return json(result.results);
 }
 if (url.pathname==='/api/uploads' && request.method==='PUT') {
  const filename=(url.searchParams.get('filename')||'').normalize('NFC');
  if (!filename || filename.length>200 || /[\x00-\x1f\/\\]/.test(filename)) throw new HttpError(400,'文件名无效。');
  const extension=filename.split('.').at(-1)!.toLowerCase(), type=types[extension];
  if (!type) throw new HttpError(415,'支持 PDF、EPUB、MOBI、AZW3 和 PNG、JPEG、WebP。');
  const length=request.headers.get('Content-Length'), size=Number(length);
  if (!length || !Number.isSafeInteger(size) || size<1 || size>(type.kind==='image'?16:90)*1048576) throw new HttpError(413,'文件大小超出限制。');
  const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'文件为空。');
  const chunks:Uint8Array[]=[];let prefixBytes=0;
  while(prefixBytes<80){const part=await reader.read();if(part.done)break;chunks.push(part.value);prefixBytes+=part.value.byteLength;}
  const prefix=new Uint8Array(Math.min(80,prefixBytes));let cursor=0;for(const chunk of chunks){const copied=chunk.subarray(0,prefix.length-cursor);prefix.set(copied,cursor);cursor+=copied.length;if(cursor===prefix.length)break;}
  if(!signature(extension,prefix)){await reader.cancel();throw new HttpError(415,'文件内容与格式不符。');}
  const id=crypto.randomUUID(),key=`incoming/${user.id}/${id}.${extension}`,bucket=type.kind==='ebook'?env.LIBRARY_BUCKET:env.MEDIA_BUCKET;
  const quotaKey=`${user.id}:${Math.floor(now/86400)}`;
  let reserved: D1Result[];
  try {
   reserved=await env.DB.batch([
    env.DB.prepare('INSERT INTO uploads(id,owner_id,kind,filename,object_key,content_type,bytes,created_at,updated_at) SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?8 WHERE coalesce((SELECT bytes FROM upload_limits WHERE key=?9),0)+?7<=1073741824 AND coalesce((SELECT count FROM upload_limits WHERE key=?9),0)<20 RETURNING id').bind(id,user.id,type.kind,filename,key,type.mime,size,now,quotaKey),
    env.DB.prepare('INSERT INTO upload_limits(key,bytes,count,expires_at) SELECT ?1,?2,1,?3 WHERE EXISTS(SELECT 1 FROM uploads WHERE id=?4) ON CONFLICT(key) DO UPDATE SET bytes=bytes+?2,count=count+1').bind(quotaKey,size,now+86400,id),
   ]);
  } catch(error) { await reader.cancel(); throw error; }
  if(!reserved[0].results.length){await reader.cancel();throw new HttpError(429,'今日上传额度已用完，请明天再试。');}
  let sent=0,first=true;
  const input=new ReadableStream<Uint8Array>({async pull(controller){if(first){first=false;for(const chunk of chunks){sent+=chunk.length;controller.enqueue(chunk);}}else{const part=await reader.read();if(part.done){controller.close();return;}sent+=part.value.length;controller.enqueue(part.value);}if(sent>size){await reader.cancel();controller.error(new Error('Upload size mismatch'));}},cancel(reason){return reader.cancel(reason);}});
  const stream=new FixedLengthStream(size);
  const abort=new AbortController();
  try {
   await Promise.all([input.pipeTo(stream.writable,{signal:abort.signal}),bucket.put(key,stream.readable,{httpMetadata:{contentType:type.mime,cacheControl:'private, no-store'}})]);
   await env.DB.prepare('UPDATE uploads SET state=\'ready\',updated_at=?1 WHERE id=?2').bind(nowSeconds(),id).run();
  } catch {
   abort.abort();
   await env.DB.batch([
    env.DB.prepare('UPDATE uploads SET state=\'failed\',updated_at=?1 WHERE id=?2').bind(nowSeconds(),id),
    env.DB.prepare('UPDATE upload_limits SET bytes=max(0,bytes-?1),count=max(0,count-1) WHERE key=?2').bind(size,quotaKey),
   ]);
   // Preserve failed records and any uploaded object for recovery; never delete original files here.
   throw new HttpError(503,'上传未完成，请稍后重试。');
  }
  await audit(env,user.id,'uploads.create',id);return json({id,state:'ready'},201);
 }
 const match=/^\/api\/uploads\/([a-f0-9-]{36})(\/content)?$/.exec(url.pathname);
 if(!match)throw new HttpError(404,'未找到上传记录。');
 const record=await env.DB.prepare('SELECT * FROM uploads WHERE id=?1 AND state=\'ready\'').bind(match[1]).first<Upload>();
 if(!record)throw new HttpError(404,'未找到上传记录。');
 if(record.owner_id!==user.id&&!moderator)throw new HttpError(403,'只能管理自己的上传。');
 if(match[2]&&request.method==='GET'){
  const bucket=record.kind==='ebook'?env.LIBRARY_BUCKET:env.MEDIA_BUCKET,object=await bucket.get(record.object_key);
  if(!object)throw new HttpError(404,'文件暂时不可用。');
  return new Response(object.body,{headers:{'Content-Type':record.content_type,'Content-Length':String(object.size),'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(record.filename)}`,'Cache-Control':'private, no-store'}});
 }
 if(!match[2]&&request.method==='PATCH'){
  const input=await body(request,10000);
  if(input.review!==undefined){
   if(!moderator||!['approved','rejected'].includes(String(input.review)))throw new HttpError(403,'需要内容审核权限。');
   const selfReview=record.owner_id===user.id;
   if(selfReview&&(!can(user,'site:manage')||input.overrideSelfReview!==true))throw new HttpError(403,'请由另一位审核者处理；管理员可明确确认自审。');
   await env.DB.prepare('UPDATE uploads SET review_state=?1,updated_at=?2 WHERE id=?3').bind(input.review,now,record.id).run();await audit(env,user.id,selfReview?'uploads.review.self-override':'uploads.review',record.id);
  }else{
   if(record.owner_id!==user.id&&!can(user,'site:manage'))throw new HttpError(403,'不能修改他人资源资料。');
   const metadata=input.metadata as Record<string,unknown>;
   if(!metadata||typeof metadata!=='object'||Array.isArray(metadata)||typeof metadata.title!=='string'||!metadata.title.trim()||metadata.title.length>300||!Array.isArray(metadata.authors)||metadata.authors.length>20||metadata.authors.some(value=>typeof value!=='string'||value.length>100)||typeof metadata.description!=='string'||metadata.description.length>2000)throw new HttpError(400,'请填写标题、作者列表和简短介绍。');
   const cleaned={title:metadata.title.trim(),authors:metadata.authors,description:metadata.description};
   await env.DB.prepare('UPDATE uploads SET metadata=?1,review_state=\'pending\',updated_at=?2 WHERE id=?3').bind(JSON.stringify(cleaned),now,record.id).run();await audit(env,user.id,'uploads.metadata',record.id);
  }
  return json({ok:true});
 }
 throw new HttpError(405,'方法不支持。');
}
