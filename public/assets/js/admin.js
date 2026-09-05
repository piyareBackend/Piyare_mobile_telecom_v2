window.Admin={
 api:window.PMT_PUBLIC_API_URL||"/api",
 async request(payload){
  this.api=window.PMT_PUBLIC_API_URL||"/api";
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
   const r=await fetch(this.api,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8","Accept":"application/json"},body:JSON.stringify(payload),credentials:"same-origin",cache:"no-store",redirect:"follow",signal:controller.signal});
   const text=await r.text();let d;try{d=JSON.parse(text)}catch(_){throw Error(r.ok?"Invalid API response from /api. Please refresh the page.":`API error (${r.status}). Please try again.`)}
   if(!r.ok||d.ok===false)throw Error(d.message||`API request failed (${r.status})`);return d;
  }catch(e){if(e.name==="AbortError")throw Error("API request timed out. Please try again.");throw e}finally{clearTimeout(timer)}
 },
 async login(username,password){
  this.api=window.PMT_PUBLIC_API_URL||"/api";localStorage.removeItem("pmt-api-url");
  const d=await this.request({action:"adminLogin",username,password});
  if(!d.token)throw Error(d.message||"Login failed");
  sessionStorage.setItem("pmt-admin-token",d.token);sessionStorage.setItem("pmt-admin-user",JSON.stringify(d.user||{}));location.href="dashboard.html";
 },
 auth(){return sessionStorage.getItem("pmt-admin-token")},
 user(){try{return JSON.parse(sessionStorage.getItem("pmt-admin-user")||"{}")}catch(e){return {}}},
 logout(){const t=this.auth();if(t)this.request({action:"logout",token:t}).catch(()=>{});sessionStorage.removeItem("pmt-admin-token");sessionStorage.removeItem("pmt-admin-user");location.replace("login.html")}
};
(function(){
 if(location.pathname.endsWith('/login.html')||location.pathname.endsWith('/login'))return;
 const style=document.createElement('style');style.textContent=`.admin-mobile-menu{display:none!important}.pmt-identity{display:flex;align-items:center;gap:9px;margin-left:auto}.pmt-avatar{width:34px;height:34px;border-radius:50%;object-fit:cover;background:#fff2;border:1px solid #fff5;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;flex:0 0 auto}.pmt-identity-copy{display:flex;flex-direction:column;line-height:1.15;min-width:0}.pmt-identity-name{font-size:.84rem;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px}.pmt-identity-meta{font-size:.68rem;color:#d1d5db;white-space:nowrap}.pmt-logout{border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);color:#fff;border-radius:9px;padding:8px 12px;font:inherit;font-weight:700;cursor:pointer;white-space:nowrap}.pmt-logout:hover{background:rgba(255,255,255,.16)}@media(max-width:800px){.pmt-identity{gap:7px}.pmt-identity-copy{display:none}.pmt-logout{padding:8px 9px}.admin-top{display:flex!important}.admin-top>a[href*="index.html"]{display:none!important}.admin-mobile-menu{display:flex!important;flex-direction:column!important;justify-content:center!important;gap:4px!important;width:38px!important;height:38px!important;border-radius:9px!important;background:rgba(255,255,255,.1)!important;padding:8px!important;flex-shrink:0}.admin-mobile-menu span{display:block!important;height:2px!important;width:20px!important;background:#fff!important;border-radius:2px!important}.admin-menu-overlay{display:none}.admin-sidebar{position:fixed!important;left:0!important;top:0!important;bottom:0!important;width:min(290px,82vw)!important;height:100dvh!important;z-index:110!important;overflow-y:auto!important;background:var(--surface,#fff)!important;box-shadow:16px 0 40px rgba(0,0,0,.22)!important;transform:translateX(-105%)!important;transition:transform .22s ease!important;padding:76px 14px 24px!important;display:flex!important;flex-direction:column!important;gap:4px!important}.admin-sidebar.mobile-open{transform:translateX(0)!important}.admin-sidebar a{display:flex!important;align-items:center!important;min-height:44px!important;padding:10px 13px!important;border-radius:9px!important;color:var(--text,#1B1F3B)!important;font-weight:600!important}.admin-menu-overlay{position:fixed!important;inset:0!important;z-index:105!important;background:rgba(0,0,0,.42)!important;display:block!important;opacity:0!important;pointer-events:none!important;transition:opacity .2s ease!important}.admin-menu-overlay.open{opacity:1!important;pointer-events:auto!important}body.admin-menu-open{overflow:hidden!important}.admin-main{margin-left:0!important;width:100%!important;padding:24px 16px!important}.kpi-grid{grid-template-columns:1fr!important}.cms-grid{grid-template-columns:1fr!important}.admin-table{min-width:650px!important}.table-wrap{overflow-x:auto!important}.admin-actions{display:flex!important;flex-wrap:wrap!important;gap:8px!important}}`;document.head.appendChild(style);
 function identity(){
  const header=document.querySelector('.admin-top');if(!header||document.getElementById('pmtIdentity'))return;
  let user={};try{user=JSON.parse(sessionStorage.getItem('pmt-admin-user')||'{}')}catch(_){}
  const wrap=document.createElement('div');wrap.id='pmtIdentity';wrap.className='pmt-identity';
  const avatar=document.createElement('div');avatar.className='pmt-avatar';
  if(user.avatarUrl){const img=document.createElement('img');img.src=user.avatarUrl;img.alt='';img.className='pmt-avatar';avatar.replaceWith(img)}else avatar.textContent=String(user.name||user.username||'U').trim().slice(0,1).toUpperCase();
  const copy=document.createElement('div');copy.className='pmt-identity-copy';copy.innerHTML='<span class="pmt-identity-name">'+esc(String(user.name||user.username||'User'))+'</span><span class="pmt-identity-meta">@'+esc(String(user.username||''))+' · '+esc(String(user.role||'Staff'))+'</span>';
  const logout=document.createElement('button');logout.type='button';logout.className='pmt-logout';logout.textContent='Logout';logout.onclick=()=>window.Admin.logout();
  wrap.appendChild(avatar.tagName==='IMG'?avatar:avatar);wrap.appendChild(copy);wrap.appendChild(logout);header.appendChild(wrap);
 }
 function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
 function init(){
  identity();
  const sidebar=document.querySelector('.admin-sidebar'),header=document.querySelector('.admin-top');if(!sidebar||!header||document.querySelector('.admin-mobile-menu'))return;
  const button=document.createElement('button');button.className='admin-mobile-menu';button.type='button';button.setAttribute('aria-label','Open menu');button.setAttribute('aria-expanded','false');button.innerHTML='<span></span><span></span><span></span>';header.insertBefore(button,header.firstChild);
  const overlay=document.createElement('div');overlay.className='admin-menu-overlay';document.body.appendChild(overlay);
  const close=()=>{sidebar.classList.remove('mobile-open');overlay.classList.remove('open');button.setAttribute('aria-expanded','false');document.body.classList.remove('admin-menu-open')};
  button.onclick=()=>{const open=!sidebar.classList.contains('mobile-open');sidebar.classList.toggle('mobile-open',open);overlay.classList.toggle('open',open);button.setAttribute('aria-expanded',String(open));document.body.classList.toggle('admin-menu-open',open)};overlay.onclick=close;sidebar.querySelectorAll('a').forEach(a=>a.onclick=close);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
(function(){
 if(!/\/product-editor(?:\.html)?$/.test(location.pathname))return;
 function enhance(){const input=document.getElementById('images');if(!input||document.getElementById('productImageDropzone'))return;
  const zone=document.createElement('div');zone.id='productImageDropzone';zone.className='pmt-image-dropzone';zone.tabIndex=0;zone.innerHTML='<strong>Drop product images here</strong><span>or click to choose • JPG, PNG, WebP • up to 4 images</span><small>Images preview instantly and upload to Drive when you save.</small>';
  const css=document.createElement('style');css.textContent='.pmt-image-dropzone{border:1px dashed var(--line);border-radius:14px;padding:22px;text-align:center;background:var(--surface);cursor:pointer;display:flex;flex-direction:column;gap:6px;transition:.15s}.pmt-image-dropzone:hover,.pmt-image-dropzone.drag{border-color:var(--blue);transform:translateY(-1px)}.pmt-image-dropzone strong{font-size:1rem}.pmt-image-dropzone span,.pmt-image-dropzone small{color:var(--gray);font-size:.8rem}.pmt-image-dropzone input{display:none}';document.head.appendChild(css);
  input.style.display='none';input.parentNode.insertBefore(zone,input);
  const acceptFiles=files=>{const valid=[...files].filter(f=>['image/jpeg','image/png','image/webp'].includes(f.type));if(!valid.length)return;const dt=new DataTransfer();valid.slice(0,4).forEach(f=>dt.items.add(f));try{input.files=dt.files}catch(e){}input.dispatchEvent(new Event('change',{bubbles:true}));};
  zone.onclick=()=>input.click();zone.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click()}};['dragenter','dragover'].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.add('drag')}));['dragleave','drop'].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.remove('drag')}));zone.addEventListener('drop',e=>acceptFiles(e.dataTransfer.files));
  input.addEventListener('change',()=>{const n=input.files.length;zone.querySelector('strong').textContent=n?`${n} image${n>1?'s':''} selected`:'Drop product images here';});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();
/* Load the centralized staff access controller on every admin page. */
(function(){
 if(!/\/admin\//.test(location.pathname)||/login\.html$/i.test(location.pathname))return;
 if(window.PMT_ACCESS_V3)return;
 const s=document.createElement('script');
 s.src='../assets/js/access-control-v3.js';
 s.async=false;
 document.head.appendChild(s);
})();
