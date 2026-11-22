import { el, button, field, bind, word, ask } from './ui.js';
import { authError } from './auth.js';

/** Community operations use named controls; no source JSON or database identifiers in the workspace. */
export async function comments(c) {
 const toolbar=el('form','','list-toolbar'),search=el('input'),state=el('select'),submit=el('button',['筛选','Filter']);
 search.type='search';bind(search,['搜索评论或书名','Search comments or titles'],'placeholder');bind(search,['搜索评论或标题','Search comments or titles'],'aria-label');
 for(const [value,label] of [['all',['全部状态','All states']],['visible',['可见','Visible']],['hidden',['已隐藏','Hidden']]]){const option=el('option',label);option.value=value;state.append(option);}
 bind(state,['评论状态','Comment status'],'aria-label');submit.type='submit';toolbar.append(search,state,submit);
 const status=el('p','','record-meta'),list=el('ul','','records comment-review-list'),pagination=el('nav','','pagination');status.setAttribute('role','status');bind(pagination,['评论分页','Comment pages'],'aria-label');c.workspace.append(toolbar,status,list,pagination);
 let page=1,version=0;
 async function load(focus=false){
  const run=++version;submit.disabled=true;
  try{
   const data=await c.api('comments/manage?'+new URLSearchParams({q:search.value,state:state.value,page:String(page)}));
   if(!c.current()||run!==version)return;
   bind(status,data.total?()=>word(['共 ',''])+data.total+word([' 条评论',data.total===1?' comment':' comments']):['没有符合条件的评论。','No matching comments.']);
   list.replaceChildren();
   for(const record of data.records){
    const row=el('li'),copy=el('div'),title=el('a',record.threadTitle,'record-title'),body=el('p',record.body,'comment-review-body'),actions=el('div','','record-actions');
    title.href=(record.threadKind==='ebook'?'/ebooks/':'/blog/')+encodeURIComponent(record.threadId)+'/#discussion';title.target='_blank';title.rel='noopener noreferrer';
    copy.append(title,el('p',()=>record.authorName+' · '+word(record.state==='hidden'?['已隐藏','Hidden']:['可见','Visible']),'record-meta'),body);row.append(copy,actions);
    const update=async(change)=>{try{await c.api('comments/'+record.id,{method:change?'PATCH':'DELETE',...(change?{body:JSON.stringify(change)}:{})});await load(true);}catch(error){c.tell(authError(error));}};
    actions.append(button(record.state==='hidden'?['恢复显示','Restore']:['隐藏','Hide'],()=>update({state:record.state==='hidden'?'visible':'hidden'})),button(['删除','Delete'],async()=>{if(await ask(['删除这条评论？此操作会移除评论正文。','Delete this comment? Its text will be removed.']))await update();}));
    list.append(row);
   }
   const pages=Math.max(1,Math.ceil(data.total/data.pageSize)),prev=button(['上一页','Previous'],()=>{page--;void load(true);}),next=button(['下一页','Next'],()=>{page++;void load(true);});prev.disabled=page<=1;next.disabled=page>=pages;
   pagination.replaceChildren(prev,el('span',`${page} / ${pages}`),next);
   if(focus){status.tabIndex=-1;status.focus();}
  }catch(error){if(c.current())c.tell(authError(error));}finally{if(run===version)submit.disabled=false;}
 }
 toolbar.addEventListener('submit',event=>{event.preventDefault();page=1;void load();});
 await load();
}
