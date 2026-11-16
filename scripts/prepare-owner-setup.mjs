import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(!process.argv.includes('--remote')){console.log('Usage: node scripts/prepare-owner-setup.mjs --remote\nCreate a private, single-use owner setup link. No password is requested or stored by this command.');process.exit(0);}
const directory=path.join(root,'.tmp/owner-initialization');await fs.mkdir(directory,{recursive:true,mode:0o700});await fs.chmod(directory,0o700);
const token=randomBytes(32).toString('hex'),hash=createHash('sha256').update(token).digest('hex'),expires=Math.floor(Date.now()/1000)+86400;
const sql=path.join(directory,'issue.sql');
await fs.writeFile(sql,`INSERT INTO owner_initialization(id,token_hash,expires_at,used_at) SELECT 'owner','${hash}',${expires},NULL WHERE EXISTS(SELECT 1 FROM users WHERE email='weiser@telysta.com' AND password_hash IS NULL AND status='active') ON CONFLICT(id) DO UPDATE SET token_hash=excluded.token_hash,expires_at=excluded.expires_at,used_at=NULL RETURNING id;`,{mode:0o600});
const result=spawnSync(process.execPath,[path.join(root,'workers/console/node_modules/wrangler/bin/wrangler.js'),'d1','execute','DB','--remote','--file',sql,'--json'],{cwd:path.join(root,'workers/console'),encoding:'utf8',maxBuffer:4*1024*1024});
await fs.writeFile(path.join(directory,'operation.log'),(result.stdout||'')+'\n'+(result.stderr||''),{mode:0o600});
await fs.unlink(sql);
if(result.status!==0){console.error('Could not issue setup link. Inspect the private operation log.');process.exit(1);}
const start=result.stdout.indexOf('[');let rows=[];try{rows=JSON.parse(result.stdout.slice(start));}catch{}
if(!rows.some(row=>row.results?.some(record=>record.id==='owner'))){console.error('The owner account is already initialized or unavailable. No setup link created.');process.exit(1);}
const url='https://telysta.com/telysta-console/#setup='+token;
await fs.writeFile(path.join(directory,'setup-link.txt'),url+'\n',{mode:0o600});
await fs.writeFile(path.join(directory,'setup-link.html'),`<!doctype html><meta charset="utf-8"><title>Telysta owner setup</title><p>This private link expires at ${new Date(expires*1000).toISOString()} and works once.</p><a href="${url}" rel="noreferrer">Set your owner username and password</a>`,{mode:0o600});
console.log('Private setup link saved to .tmp/owner-initialization/setup-link.html (and setup-link.txt). Expires in 24 hours.');
