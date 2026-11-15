export class HttpError extends Error {
 constructor(public status: number, message: string) { super(message); }
}
export function json(value: unknown, status = 200) {
 return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
export async function body(request: Request, max = 4096): Promise<Record<string, unknown>> {
 if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new HttpError(415, '需要JSON请求。');
 const reader = request.body?.getReader(); if (!reader) throw new HttpError(400, '请求为空。');
 const chunks: Uint8Array[] = []; let size = 0;
 while (true) {
  const part = await reader.read(); if (part.done) break;
  size += part.value.length; if (size > max) { await reader.cancel(); throw new HttpError(413, '内容过大。'); }
  chunks.push(part.value);
 }
 const data = new Uint8Array(size); let position = 0;
 for (const chunk of chunks) { data.set(chunk, position); position += chunk.length; }
 try { const value = JSON.parse(new TextDecoder().decode(data)); if (!value || typeof value !== 'object' || Array.isArray(value)) throw 0; return value; }
 catch { throw new HttpError(400, 'JSON无效。'); }
}
