import fs from 'node:fs';
import path from 'node:path';
const config=JSON.parse(fs.readFileSync('data/seo/indexnow.json','utf8')) as {host:string;key:string;keyLocation:string};
const sitemap=fs.readFileSync('dist/sitemap.xml','utf8');
const published=new Set([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match=>match[1].replaceAll('&amp;','&')));
const requested=process.argv.slice(2).filter(arg=>arg!=='--submit');
const defaults=['/','/blog/','/about/','/gallery/','/ebooks/','/series/'].map(value=>'https://'+config.host+value);
defaults.push(...[...published].filter(value=>new URL(value).pathname.startsWith('/blog/WEISER')).slice(0,14));
const urls=[...new Set(requested.length?requested:defaults)];
if(!urls.length||urls.length>50||urls.some(value=>new URL(value).origin!=='https://'+config.host||!published.has(value)))throw new Error('只提交站点地图中的公开URL，单批最多50条。');
if(!process.argv.includes('--submit')){console.log(JSON.stringify({dryRun:true,urls},null,2));process.exit(0);}
const headers={'User-Agent':'Mozilla/5.0 (Telysta site maintenance)'};
const verification=await fetch(config.keyLocation,{headers,signal:AbortSignal.timeout(20_000)});
if(!verification.ok||(await verification.text()).trim()!==config.key)throw new Error('公开验证文件尚未生效，停止提交。');
const response=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{...headers,'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({...config,urlList:urls}),signal:AbortSignal.timeout(20_000)});
const result={submittedAt:new Date().toISOString(),endpoint:'https://api.indexnow.org/indexnow',status:response.status,accepted:[200,202].includes(response.status),urls};
const directory=path.resolve('.tmp/seo');fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'indexnow-last.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,accepted:result.accepted,urlCount:urls.length}));
if(!result.accepted)process.exitCode=1;
