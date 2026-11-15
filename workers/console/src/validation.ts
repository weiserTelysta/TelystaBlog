import { parseDocument } from 'yaml';
import { HttpError } from './http';

export function validatedSource(kind: string, id: string, source: string, access: 'public'|'protected') {
 if (kind === 'ebook') {
  let value: Record<string,unknown>;
  try { value = JSON.parse(source); } catch { throw new HttpError(400,'书目必须是有效JSON。'); }
  if (!value || Array.isArray(value) || value.id !== id.slice('ebook_'.length)) throw new HttpError(400,'不能修改已保存的书籍固定ID。');
  return JSON.stringify({ ...value, access },null,2);
 }
 if (kind === 'post' || kind === 'gallery') {
  const match=/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if (!match) throw new HttpError(400,'内容需要保留YAML元信息。');
  let data: Record<string,unknown>;
  try { const document=parseDocument(match[1]); if (document.errors.length) throw new Error(); data=document.toJS({maxAliasCount:0}); }
  catch { throw new HttpError(400,'YAML元信息无效，请检查语法。'); }
  if (!data || Array.isArray(data) || (kind==='post' ? data.uuid !== id.slice('post_WEISER'.length) : data.id !== id.slice('gallery_'.length))) throw new HttpError(400,'不能修改已保存内容的固定编号。');
 }
 return source;
}
