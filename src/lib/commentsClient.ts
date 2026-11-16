type Comment = { id: string; body: string; parentId: string | null; parentAuthorName: string | null; authorName: string; createdAt: number; updatedAt: number; canEdit: boolean; canDelete: boolean };
type Viewer = { id: string; displayName: string } | null;
type Page = { records: Comment[]; nextCursor: string | null; viewer: Viewer };
const copy = {
 zh: { heading:'讨论', refresh:'刷新', loading:'正在读取讨论…', empty:'还没有讨论。', failure:'讨论暂时无法加载，请稍后刷新。', label:'写下你的想法', placeholder:'分享阅读感受或提出问题…', submit:'发表评论', submitting:'正在发表…', posted:'评论已发表。', reply:'回复', replying:'回复 {name}', cancelReply:'取消回复', edit:'编辑', save:'保存修改', cancel:'取消', remove:'删除', confirm:'删除这条评论？', confirmRemove:'确认删除', removed:'评论已删除。', saved:'修改已保存。', edited:'已编辑', more:'更早的讨论', identity:'以 {name} 的身份参与', input:'评论内容', invalid:'请先填写评论内容。', ownReply:'仅能回复主评论。' },
 en: { heading:'Discussion', refresh:'Refresh', loading:'Loading discussion…', empty:'No comments yet.', failure:'Discussion could not load. Please refresh and try again.', label:'Share your thoughts', placeholder:'Share a reading experience or ask a question…', submit:'Post comment', submitting:'Posting…', posted:'Comment posted.', reply:'Reply', replying:'Replying to {name}', cancelReply:'Cancel reply', edit:'Edit', save:'Save changes', cancel:'Cancel', remove:'Delete', confirm:'Delete this comment?', confirmRemove:'Delete comment', removed:'Comment deleted.', saved:'Changes saved.', edited:'Edited', more:'Earlier comments', identity:'Posting as {name}', input:'Comment', invalid:'Enter a comment first.', ownReply:'Reply to a top-level comment.' },
};
function node<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') { const element = document.createElement(tag); element.textContent = text; if (className) element.className = className; return element; }
function action(text: string, handler: () => void | Promise<void>) { const button = node('button',text); button.type='button'; button.addEventListener('click',()=>{void handler();}); return button; }
export function initCloudComments() {
 for (const root of document.querySelectorAll<HTMLElement>('[data-cloud-comments]')) {
  if (root.dataset.ready) continue;
  root.dataset.ready='true';
  const locale = document.documentElement.lang.startsWith('en') ? 'en' : 'zh', t = copy[locale];
  const list=root.querySelector<HTMLElement>('[data-comments-list]')!, status=root.querySelector<HTMLElement>('[data-comments-status]')!, form=root.querySelector<HTMLFormElement>('[data-comments-form]')!, input=root.querySelector<HTMLTextAreaElement>('[data-comments-input]')!, submit=root.querySelector<HTMLButtonElement>('[data-comments-submit]')!, more=root.querySelector<HTMLButtonElement>('[data-comments-more]')!, cancel=root.querySelector<HTMLButtonElement>('[data-comments-cancel]')!, replyNote=root.querySelector<HTMLElement>('[data-comments-reply]')!;
  const query=new URLSearchParams({kind:root.dataset.threadKind!,id:root.dataset.threadId!}), endpoint='/console/api/comments';
  let cursor:string|null=null, viewer:Viewer=null, generation=0, parentId:string|null=null;
  const identify=root.querySelector<HTMLElement>('[data-comments-identity]')!, counter=root.querySelector<HTMLElement>('[data-comments-count]')!;
  root.querySelector('[data-comments-heading]')!.textContent=t.heading;
  root.querySelector('[data-comments-refresh]')!.textContent=t.refresh;
  root.querySelector('[data-comments-label]')!.textContent=t.label;
  const labelId='comment-'+root.dataset.threadKind+'-'+root.dataset.threadId;
  input.id=labelId;root.querySelector('label')!.htmlFor=labelId;
  input.placeholder=t.placeholder;input.setAttribute('aria-label',t.input);submit.textContent=t.submit;more.textContent=t.more;cancel.textContent=t.cancelReply;
  const date=new Intl.DateTimeFormat(locale==='zh'?'zh-CN':'en',{dateStyle:'medium',timeStyle:'short'});
  function resetReply() {parentId=null;replyNote.textContent='';cancel.hidden=true;}
  function count() {counter.textContent=`${input.value.length} / 4000`;input.setCustomValidity('');}
  input.addEventListener('input',count);cancel.addEventListener('click',resetReply);
  async function api<T>(url:string, options:RequestInit = {}):Promise<T> {
   const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});
   const data=await response.json();
   if(!response.ok) {if(response.status===404&&root.dataset.restricted){root.hidden=true;list.replaceChildren();input.value='';resetReply();}throw new Error(data.error||t.failure);}
   return data as T;
  }
  function render(record:Comment) {
   const article=node('article','','cloud-comment'), metadata=node('div','','cloud-comment__meta'), text=node('p',record.body,'cloud-comment__body'), controls=node('div','','cloud-comment__actions');
   metadata.append(node('span',record.authorName,'cloud-comment__author'));
   const time=node('time',date.format(record.createdAt*1000));time.dateTime=new Date(record.createdAt*1000).toISOString();metadata.append(time);
   if(record.updatedAt>record.createdAt)metadata.append(node('span',t.edited));
   article.append(metadata);
   if(record.parentAuthorName)article.append(node('p',t.replying.replace('{name}',record.parentAuthorName),'cloud-comment__reply'));
   article.append(text);
   if(viewer&&!record.parentId)controls.append(action(t.reply,()=>{parentId=record.id;replyNote.textContent=t.replying.replace('{name}',record.authorName);cancel.hidden=false;input.focus();}));
   if(record.canEdit)controls.append(action(t.edit,()=>{
    if(article.querySelector('form'))return;
    const edit=node('form','','cloud-comment__edit'), field=node('textarea'), buttons=node('div','','cloud-comment__actions'), save=node('button',t.save);
    field.value=record.body;field.maxLength=4000;field.required=true;field.setAttribute('aria-label',t.input);save.type='submit';
    buttons.append(action(t.cancel,()=>{edit.remove();text.hidden=false;controls.hidden=false;}),save);edit.append(field,buttons);text.hidden=true;controls.hidden=true;article.append(edit);field.focus();
    edit.addEventListener('submit',async event=>{event.preventDefault();save.disabled=true;try{await api(endpoint+'/'+record.id,{method:'PATCH',body:JSON.stringify({body:field.value})});await load();status.textContent=t.saved;}catch(error){status.textContent=(error as Error).message;}finally{save.disabled=false;}});
   }));
   if(record.canDelete)controls.append(action(t.remove,()=>{
    if(article.querySelector('.cloud-comment__confirm'))return;
    const confirmation=node('div',t.confirm,'cloud-comment__confirm');
    const remove=action(t.confirmRemove,async()=>{remove.disabled=true;try{await api(endpoint+'/'+record.id,{method:'DELETE'});await load();status.textContent=t.removed;}catch(error){status.textContent=(error as Error).message;remove.disabled=false;}});
    confirmation.append(action(t.cancel,()=>{confirmation.remove();controls.hidden=false;}),remove);controls.hidden=true;article.append(confirmation);remove.focus();
   }));
   if(controls.childElementCount)article.append(controls);
   return article;
  }
  async function load(append=false,quiet=false) {
   const version=++generation;
   const search=new URLSearchParams(query);if(append&&cursor)search.set('before',cursor);
   if(!quiet){status.textContent=t.loading;more.disabled=true;}
   try {
    const result=await api<Page>(endpoint+'?'+search);
    if(version!==generation)return;
    const changed=viewer?.id!==result.viewer?.id;
    viewer=result.viewer;form.hidden=!viewer;identify.textContent=viewer?t.identity.replace('{name}',viewer.displayName):'';
    if(changed){input.value='';resetReply();count();}
    root.hidden=false;
    if(quiet&&!changed)return;
    cursor=result.nextCursor;
    if(!append)list.replaceChildren();
    list.append(...result.records.map(render));
    status.textContent=list.childElementCount?'':t.empty;more.hidden=!cursor;
   } catch(error) {if(version===generation&&!quiet){status.textContent=(error as Error).message;}}
   finally {if(version===generation)more.disabled=false;}
  }
  more.addEventListener('click',()=>{void load(true);});
  root.querySelector('[data-comments-refresh]')!.addEventListener('click',()=>{void load();});
  form.addEventListener('submit',async event=>{
   event.preventDefault();if(!input.value.trim()){input.setCustomValidity(t.invalid);input.reportValidity();return;}
   submit.disabled=true;submit.textContent=t.submitting;submit.setAttribute('aria-busy','true');
   try{await api(endpoint+'?'+query,{method:'POST',body:JSON.stringify({body:input.value,parentId})});input.value='';resetReply();count();await load();status.textContent=t.posted;}
   catch(error){status.textContent=(error as Error).message;}
   finally{submit.disabled=false;submit.textContent=t.submit;submit.removeAttribute('aria-busy');}
  });
  window.addEventListener('storage',event=>{if(event.key==='telysta.account.event'){list.replaceChildren();form.hidden=true;if(root.dataset.restricted)root.hidden=true;void load();}});
  window.addEventListener('library-access-change',()=>{if(root.dataset.restricted){root.hidden=true;list.replaceChildren();input.value='';resetReply();}void load();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void load(false,true);});
  window.setInterval(()=>{if(!document.hidden)void load(false,true);},30000);
  void load();
 }
}
