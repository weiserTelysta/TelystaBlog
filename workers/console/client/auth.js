const copy = {
 zh: {
  login:'登录', register:'创建账户', email:'邮箱验证', admin:'管理员验证', reset:'找回密码', setup:'设置用户名和密码',
  identifier:'用户名或邮箱', username:'用户名', emailLabel:'邮箱', password:'密码', code:'六位验证码',
  send:'获取验证码', sent:'验证码已发送，五分钟内有效。', sending:'正在发送…', working:'正在处理…',
  expiry:'5 分钟内有效', show:'显示', hide:'隐藏', showPassword:'显示密码', hidePassword:'隐藏密码',
  passwordHelp:'至少15个字符，可使用空格与中文。', usernameHelp:'以字母开头，3–24位字母、数字、下划线或短横线。',
  loginWithPassword:'使用密码登录', loginWithEmail:'旧账户／站主邮箱验证', returnLogin:'返回登录',
  submitRegister:'验证邮箱并创建账户', submitReset:'重置密码', submitSetup:'保存并继续', later:'稍后设置',
  resetDone:'密码已重置，其他设备已退出。请使用新密码登录。',
  checking:'正在检查用户名…', available:'用户名可用', unavailable:'这个用户名不可使用，请换一个。',
  checkLater:'暂时无法检查，提交时会再次验证。', cooldown:seconds=>`${seconds} 秒后重发`,
  loading:'正在读取账户…', profile:'账户设置', displayName:'昵称', saveProfile:'保存昵称', savedProfile:'昵称已保存。',
  currentPassword:'当前密码', newPassword:'新密码', changePassword:'修改密码', changedPassword:'密码已修改，其他设备已退出。',
  setupFromProfile:'验证邮箱并设置用户名、密码', failed:'操作未完成，请检查输入或稍后重试。',
 },
 en: {
  login:'Sign in', register:'Create account', email:'Verify email', admin:'Owner verification', reset:'Reset password', setup:'Set your username and password',
  identifier:'Username or email', username:'Username', emailLabel:'Email', password:'Password', code:'Verification code',
  send:'Send code', sent:'Code sent. It expires in five minutes.', sending:'Sending…', working:'Working…',
  expiry:'Valid for 5 minutes', show:'Show', hide:'Hide', showPassword:'Show password', hidePassword:'Hide password',
  passwordHelp:'At least 15 characters. Spaces and Unicode are welcome.', usernameHelp:'3–24 letters, numbers, underscores or hyphens; start with a letter.',
  loginWithPassword:'Use a password', loginWithEmail:'Verify an existing account or owner email', returnLogin:'Back to sign in',
  submitRegister:'Verify email and create account', submitReset:'Reset password', submitSetup:'Save and continue', later:'Set up later',
  resetDone:'Password reset. Other devices are signed out. Sign in with your new password.',
  checking:'Checking username…', available:'Username available', unavailable:'This username is unavailable. Choose another.',
  checkLater:'Unable to check now. We will check when you submit.', cooldown:seconds=>`Resend in ${seconds}s`,
  loading:'Loading your account…', profile:'Account settings', displayName:'Display name', saveProfile:'Save display name', savedProfile:'Display name saved.',
  currentPassword:'Current password', newPassword:'New password', changePassword:'Change password', changedPassword:'Password changed. Other devices are signed out.',
  setupFromProfile:'Verify email to set a username and password', failed:'Unable to complete this action. Check your details or try again later.',
 },
};
const errors = {
 USERNAME_INVALID:'Use 3–24 letters, numbers, underscores or hyphens, starting with a letter.',
 USERNAME_TAKEN:'This username is unavailable. Choose another.', USERNAME_REQUIRED:'Choose a username for your existing account.',
 PASSWORD_INVALID:'Use no more than 128 characters and no null characters.', PASSWORD_WEAK:'Use at least 15 characters and avoid common passwords.',
 EMAIL_INVALID:'Enter a valid email address.', CODE_INVALID:'This code is incorrect or expired. Request a new one.',
 LOGIN_INVALID:'The username, email or password is incorrect.', CURRENT_PASSWORD_INVALID:'Your current password is incorrect.',
 ACCOUNT_EXISTS:'This email already has an account. Sign in or reset its password.', EMAIL_REVERIFY:'Verify your email again before setting a password.',
 HTTP_400:'Check the details you entered.', HTTP_401:'Verify your account again.', HTTP_403:'You do not have permission to do this.',
 HTTP_409:'The account state changed. Check your details and try again.', HTTP_413:'The request is too large.',
 HTTP_429:'Too many attempts. Please wait and try again.', HTTP_503:'The service is temporarily unavailable. Try again later.',
};
const node = (tag,text='',className='') => {const result=document.createElement(tag);result.textContent=text;if(className)result.className=className;return result;};
const button = (text,action) => {const result=node('button',text,'text-button');result.type='button';result.addEventListener('click',action);return result;};
function storedLanguage(){try{return localStorage.getItem('telysta.console.locale')==='en'?'en':'zh';}catch{return'zh';}}

export function initAuthentication({api,authenticated,profileUpdated,adminEntry}) {
 const $=selector=>document.querySelector(selector), form=$('#login-form');
 let language=storedLanguage(), mode=adminEntry?'email':'login', busy=false, setupUser=null, needsResetUsername=false, forceSetup=false;
 let checkTimer, checkGeneration=0;
 const sentTimes=new Map();
 const text=()=>copy[language];
 const routeMode=()=>{
  const requested=new URL(location.href).searchParams.get('view');
  return ['login','email','reset',...(adminEntry?[]:['register'])].includes(requested)?requested:(adminEntry?'email':'login');
 };
 mode=routeMode();
 const fieldNames=['identifier','username','email','password','code'];
 const value=name=>$('#'+name).value;
 const creating=()=>['register','reset','setup'].includes(mode);
 function clearErrors(){
  for(const name of fieldNames){$('#'+name).removeAttribute('aria-invalid');$('#'+name+'-error').textContent='';$('#'+name).setCustomValidity('');}
  $('#login-status').textContent='';
 }
 function failure(error){
  setBusy(false);
  const message=language==='en'?(errors[error.code]||text().failed):(error.message||text().failed);
  $('#login-status').textContent=message;
  if(error.code==='USERNAME_REQUIRED'){needsResetUsername=true;renderFields();}
  const input=fieldNames.includes(error.field)?$('#'+error.field):null;
  if(input&&!input.disabled){input.setAttribute('aria-invalid','true');$('#'+error.field+'-error').textContent=message;input.focus();}
  if(error.code==='EMAIL_REVERIFY')$('#auth-modes').append(button(text().email,()=>{$('#email').value=setupUser?.email||'';show('email');}));
 }
 function updateCooldown(){
  const email=value('email').trim().toLowerCase(), remaining=Math.max(0,Math.ceil(((sentTimes.get(email)||0)+60000-Date.now())/1000));
  const send=$('#send-code');send.disabled=busy||$('#email').disabled||remaining>0;send.textContent=remaining?text().cooldown(remaining):text().send;
 }
 function setBusy(value){busy=value;form.setAttribute('aria-busy',String(value));$('#sign-in').disabled=value;for(const b of $('#auth-modes').querySelectorAll('button'))b.disabled=value;for(const link of $('#auth-modes').querySelectorAll('a'))link.setAttribute('aria-disabled',String(value));renderFields();}
 function renderFields(){
  const shown={identifier:mode==='login',username:mode==='register'||mode==='setup'||mode==='reset'&&needsResetUsername,email:['register','email','reset'].includes(mode),password:mode!=='email',code:['register','email','reset'].includes(mode)};
  for(const name of fieldNames){
   $('#'+name+'-field').hidden=!shown[name];$('#'+name).disabled=!shown[name]||busy;$('#'+name).required=!!shown[name];
   const label=document.querySelector(`label[for="${name}"]`);label.textContent=text()[name==='email'?'emailLabel':name];
  }
  $('#password').autocomplete=creating()?'new-password':'current-password';
  $('#password-help').hidden=!creating();$('#password-help').textContent=text().passwordHelp;
  $('#username-help').textContent=text().usernameHelp;$('#code-expiry').textContent=text().expiry;
  $('#email').readOnly=adminEntry;$('#username').readOnly=mode==='setup'&&!!setupUser?.username;
  $('#password-toggle').textContent=$('#password').type==='password'?text().show:text().hide;
  $('#password-toggle').disabled=busy;
  $('#password-toggle').setAttribute('aria-label',$('#password').type==='password'?text().showPassword:text().hidePassword);
  $('#sign-in').textContent=mode==='register'?text().submitRegister:mode==='reset'?text().submitReset:mode==='setup'?text().submitSetup:text().login;
  updateCooldown();
 }
 function render(){
  document.documentElement.lang=language==='en'?'en':'zh-CN';
  $('#loading').textContent=text().loading;
  $('#login-title').textContent=mode==='email'&&adminEntry?text().admin:text()[mode];
  $('#auth-language').textContent=language==='zh'?'English':'中文';$('#auth-language').lang=language==='zh'?'en':'zh-CN';
  $('#auth-modes').setAttribute('aria-label',language==='zh'?'账户入口':'Account options');
  renderFields();
  const options=$('#auth-modes');options.replaceChildren();
  const add=(label,next)=>{
   const link=node('a',label,'text-button'),url=new URL(location.href);url.searchParams.set('view',next);link.href=url.pathname+url.search;
   link.addEventListener('click',event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();if(!busy)show(next);});options.append(link);
  };
  if(mode==='login'){
   if(!adminEntry)add(text().register,'register');
   add(text().loginWithEmail,'email');add(text().reset,'reset');
  }else if(mode==='email'){
   add(text().loginWithPassword,'login');if(!adminEntry)add(text().register,'register');
  }else if(mode==='setup'){
   options.append(button(text().later,()=>authenticated(setupUser)));
  }else add(text().returnLogin,'login');
 }
 function show(next,updateHistory=true){
  if(busy)return;
  mode=next;checkGeneration++;clearTimeout(checkTimer);clearErrors();
  $('#password').value='';$('#password').type='password';$('#password-toggle').setAttribute('aria-pressed','false');$('#code').value='';$('#username-status').textContent='';
  if(next!=='reset')needsResetUsername=false;
  if(updateHistory&&next!=='setup'){const url=new URL(location.href);url.searchParams.set('view',next);history.pushState({},'',url.pathname+url.search);}
  render();
 }
 async function accept(user){
  $('#password').value='';$('#code').value='';
  if(user.needsSetup && (user.role!=='admin'||forceSetup)){
   $('#account').hidden=true;$('#login').hidden=false;$('#loading').hidden=true;
   setupUser=user;busy=false;show('setup');$('#username').value=user.username||'';$('#username').readOnly=!!user.username;
   return;
  }
  await authenticated(user);
 }
 $('#auth-language').addEventListener('click',()=>{
  language=language==='zh'?'en':'zh';try{localStorage.setItem('telysta.console.locale',language);}catch{}
  clearErrors();render();
 });
 $('#password-toggle').addEventListener('click',()=>{
  const visible=$('#password').type==='password';$('#password').type=visible?'text':'password';$('#password-toggle').setAttribute('aria-pressed',String(visible));renderFields();
 });
 $('#username').addEventListener('input',()=>{
  const generation=++checkGeneration;clearTimeout(checkTimer);$('#username-status').textContent='';
  if(!/^[a-z][a-z0-9_-]{2,23}$/i.test(value('username'))||$('#username').readOnly)return;
  const username=value('username');
  checkTimer=setTimeout(async()=>{
   $('#username-status').textContent=text().checking;
   try{const result=await api('auth/username?value='+encodeURIComponent(username));if(generation===checkGeneration&&value('username')===username)$('#username-status').textContent=result.available?text().available:text().unavailable;}
   catch{if(generation===checkGeneration)$('#username-status').textContent=text().checkLater;}
  },500);
 });
 for(const name of fieldNames)$('#'+name).addEventListener('input',()=>{$('#'+name).setCustomValidity('');$('#'+name).removeAttribute('aria-invalid');$('#'+name+'-error').textContent='';if(name==='email'){$('#code').value='';updateCooldown();}});
 $('#send-code').addEventListener('click',async()=>{
  if(busy||!$('#email').reportValidity())return;
  const email=value('email').trim().toLowerCase(), purpose=mode==='register'?'register':mode==='reset'?'reset':'login';
  clearErrors();setBusy(true);$('#login-status').textContent=text().sending;
  let focusCode=false;
  try{
   await api('auth/code',{method:'POST',body:JSON.stringify({email,purpose})});sentTimes.set(email,Date.now());
   if(value('email').trim().toLowerCase()===email){$('#login-status').textContent=text().sent;focusCode=true;}
   else $('#login-status').textContent='';
  }catch(error){failure(error);}finally{setBusy(false);if(focusCode)$('#code').focus();}
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;clearErrors();
  if(creating()&&([...value('password')].length<15||[...value('password')].length>128)){
   $('#password').setCustomValidity(text().passwordHelp);$('#password').reportValidity();return;
  }
  if(!form.reportValidity())return;
  const email=value('email').trim().toLowerCase(), password=value('password'), username=value('username');
  const path=mode==='login'?'login':mode==='register'?'register':mode==='reset'?'reset':mode==='setup'?'setup':'verify';
  const payload=mode==='login'?{identifier:value('identifier'),password}:mode==='register'?{email,username,password,code:value('code')}:mode==='setup'?{username,password}:mode==='reset'?{email,password,code:value('code'),...(needsResetUsername?{username}:{})}:{email,code:value('code')};
  setBusy(true);$('#login-status').textContent=text().working;
  try{
   const result=await api('auth/'+path,{method:'POST',body:JSON.stringify(payload)});
   if(path==='reset'){setBusy(false);show('login');$('#identifier').value=email;$('#login-status').textContent=text().resetDone;$('#password').focus();}
   else await accept(result.user);
  }catch(error){failure(error);}finally{setBusy(false);}
 });
 let timer;
 const resume=()=>{if(timer===undefined)timer=setInterval(updateCooldown,1000);updateCooldown();};
 resume();window.addEventListener('pagehide',()=>{clearInterval(timer);timer=undefined;});window.addEventListener('pageshow',resume);
 window.addEventListener('popstate',()=>show(routeMode(),false));
 render();
 return {
  configure(entry){if(entry?.admin){$('#email').value=entry.email;$('#identifier').value=entry.email;}renderFields();},
  async resume(user){await accept(user);},
  show,
  unavailable(){ $('#loading').hidden=true;$('#login').hidden=false;$('#login-status').textContent=language==='en'?errors.HTTP_503:'暂时无法读取登录状态，请稍后重试或刷新。'; },
  async profile(container,user){
   container.lang=language==='en'?'en':'zh-CN';
   container.replaceChildren(node('h2',text().profile));
   const status=node('p','','small muted');status.setAttribute('role','status');
   const field=(label,id,type='text',initial='')=>{
    const group=node('div','','field'),caption=node('label',label),input=node('input');input.id=id;input.type=type;input.value=initial;caption.htmlFor=id;group.append(caption,input);return{group,input};
   };
   const display=field(text().displayName,'account-display-name','text',user.displayName||user.username||'');display.input.maxLength=40;display.input.required=true;
   const profileForm=node('form');profileForm.method='post';profileForm.action='./api/profile';
   const save=node('button',text().saveProfile);save.type='submit';profileForm.append(display.group,save);
   profileForm.addEventListener('submit',async event=>{event.preventDefault();save.disabled=true;try{const result=await api('profile',{method:'PATCH',body:JSON.stringify({displayName:display.input.value})});profileUpdated(result);status.textContent=text().savedProfile;}catch(error){status.textContent=language==='en'?(errors[error.code]||text().failed):error.message;}finally{save.disabled=false;}});
   container.append(profileForm,status);
   if(user.needsSetup){
    container.append(button(text().setupFromProfile,()=>{forceSetup=true;$('#account').hidden=true;$('#login').hidden=false;$('#email').value=user.email;show('email');}));return;
   }
   const passwordForm=node('form','','account-password-form');passwordForm.method='post';passwordForm.action='./api/auth/password';
   const current=field(text().currentPassword,'account-current-password','password'),next=field(text().newPassword,'account-new-password','password');
   current.input.autocomplete='current-password';next.input.autocomplete='new-password';current.input.required=true;next.input.required=true;current.input.maxLength=512;next.input.maxLength=512;
   const hint=node('p',text().passwordHelp,'field-help');hint.id='account-password-help';next.input.setAttribute('aria-describedby',hint.id);
   const submit=node('button',text().changePassword);submit.type='submit';passwordForm.append(current.group,next.group,hint,submit);
   passwordForm.addEventListener('submit',async event=>{event.preventDefault();if([...next.input.value].length<15||[...next.input.value].length>128){next.input.setCustomValidity(text().passwordHelp);next.input.reportValidity();return;}submit.disabled=true;try{const result=await api('auth/password',{method:'POST',body:JSON.stringify({currentPassword:current.input.value,password:next.input.value})});current.input.value='';next.input.value='';profileUpdated(result.user);status.textContent=text().changedPassword;}catch(error){status.textContent=language==='en'?(errors[error.code]||text().failed):error.message;}finally{submit.disabled=false;}});
   next.input.addEventListener('input',()=>next.input.setCustomValidity(''));container.append(passwordForm);
  },
 };
}
