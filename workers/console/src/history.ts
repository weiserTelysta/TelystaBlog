import { HttpError, json } from './http';
import { can, type User } from './permissions';
import { describeDocument, type DocumentRecord } from './documentEditor';
export async function handleHistory(request: Request, env: ConsoleEnv, user: User, url: URL) {
    if (!can(user, 'site:manage'))
        throw new HttpError(403, '只有超级管理员可以读取内容版本。');
    if (request.method !== 'GET')
        throw new HttpError(405, '方法不支持。');
    const match = /^\/api\/documents\/([A-Za-z0-9_-]{1,100})\/revisions(?:\/([1-9][0-9]{0,8}))?$/.exec(url.pathname);
    if (!match)
        throw new HttpError(404, '未找到版本接口。');
    const document = await env.DB.prepare('SELECT * FROM documents WHERE id=?1').bind(match[1]).first<DocumentRecord>();
    if (!document)
        throw new HttpError(404, '内容不存在。');
    if (match[2]) {
        const record = await env.DB.prepare('SELECT revision,source,created_at FROM document_revisions WHERE document_id=?1 AND revision=?2').bind(match[1], Number(match[2])).first<{revision:number;source:string;created_at:number}>();
        if (!record)
            throw new HttpError(404, '历史版本不存在。');
        return json({...record,editor:describeDocument({...document,source:record.source})});
    }
    const before = Number(url.searchParams.get('before') || 2147483647);
    if (!Number.isSafeInteger(before) || before < 1)
        throw new HttpError(400, '版本游标无效。');
    const records = await env.DB.prepare('SELECT r.revision,r.created_at,u.email AS editor FROM document_revisions r JOIN users u ON u.id=r.actor_id WHERE r.document_id=?1 AND r.revision<?2 ORDER BY r.revision DESC LIMIT 25').bind(match[1], before).all();
    return json({ currentRevision: document.revision, records: records.results });
}
