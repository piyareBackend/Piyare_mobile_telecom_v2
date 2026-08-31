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
  this.api=window.PMT_PUBLIC_API_URL||"/api";
  localStorage.removeItem("pmt-api-url");
  const d=await this.request({action:"adminLogin",username,password});
  if(!d.token)throw Error(d.message||"Login failed");
  sessionStorage.setItem("pmt-admin-token",d.token);sessionStorage.setItem("pmt-admin-user",JSON.stringify(d.user||{}));location.href="dashboard.html";
 },
 auth(){return sessionStorage.getItem("pmt-admin-token")},
 user(){try{return JSON.parse(sessionStorage.getItem("pmt-admin-user")||"{}")}catch(e){return {}}},
 logout(){const t=this.auth();if(t)this.request({action:"logout",token:t}).catch(()=>{});sessionStorage.removeItem("pmt-admin-token");sessionStorage.removeItem("pmt-admin-user");location.href="login.html"}
};
(function(){
 if(location.pathname.endsWith('/login.html')||location.pathname.endsWith('/login'))return;
 const style=document.createElement('style');style.textContent=`.admin-mobile-menu{display:none!important}.admin-menu-overlay{display:none}@media(max-width:800px){.admin-top{position:sticky!important;top:0!important;z-index:100!important;display:flex!important;align-items:center!important;gap:12px!important;min-height:58px!important;padding:12px 16px!important}.admin-top b{flex:1!important;font-size:1rem!important}.admin-mobile-menu{display:flex!important;flex-direction:column!important;justify-content:center!important;gap:4px!important;width:38px!important;height:38px!important;border-radius:9px!important;background:rgba(255,255,255,.1)!important;padding:8px!important;flex-shrink:0!important}.admin-mobile-menu span{display:block!important;height:2px!important;width:20px!important;background:#fff!important;border-radius:2px!important}.admin-sidebar{position:fixed!important;left:0!important;top:0!important;bottom:0!important;width:min(290px,82vw)!important;height:100dvh!important;z-index:110!important;overflow-y:auto!important;background:var(--surface,#fff)!important;box-shadow:16px 0 40px rgba(0,0,0,.22)!important;transform:translateX(-105%)!important;transition:transform .22s ease!important;padding:76px 14px 24px!important;display:flex!important;flex-direction:column!important;gap:4px!important}.admin-sidebar.mobile-open{transform:translateX(0)!important}.admin-sidebar a{display:flex!important;align-items:center!important;min-height:44px!important;padding:10px 13px!important;border-radius:9px!important;color:var(--text,#1B1F3B)!important;font-weight:600!important}.admin-menu-overlay{position:fixed!important;inset:0!important;z-index:105!important;background:rgba(0,0,0,.42)!important;display:block!important;opacity:0!important;pointer-events:none!important;transition:opacity .2s ease!important}.admin-menu-overlay.open{opacity:1!important;pointer-events:auto!important}body.admin-menu-open{overflow:hidden!important}.admin-main{margin-left:0!important;width:100%!important;padding:24px 16px!important}.kpi-grid{grid-template-columns:1fr!important}.cms-grid{grid-template-columns:1fr!important}.admin-table{min-width:650px!important}.table-wrap{overflow-x:auto!important}.admin-actions{display:flex!important;flex-wrap:wrap!important;gap:8px!important}}`;document.head.appendChild(style);
 function init(){const sidebar=document.querySelector('.admin-sidebar'),header=document.querySelector('.admin-top');if(!sidebar||!header||document.querySelector('.admin-mobile-menu'))return;const button=document.createElement('button');button.className='admin-mobile-menu';button.type='button';button.setAttribute('aria-label','Open owner menu');button.setAttribute('aria-expanded','false');button.innerHTML='<span></span><span></span><span></span>';header.insertBefore(button,header.firstChild);const overlay=document.createElement('div');overlay.className='admin-menu-overlay';document.body.appendChild(overlay);const close=()=>{sidebar.classList.remove('mobile-open');overlay.classList.remove('open');button.setAttribute('aria-expanded','false');document.body.classList.remove('admin-menu-open')};button.onclick=()=>{const open=!sidebar.classList.contains('mobile-open');sidebar.classList.toggle('mobile-open',open);overlay.classList.toggle('open',open);button.setAttribute('aria-expanded',String(open));document.body.classList.toggle('admin-menu-open',open)};overlay.onclick=close;sidebar.querySelectorAll('a').forEach(a=>a.onclick=close)}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
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
