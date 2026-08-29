window.Admin={
 api:localStorage.getItem("pmt-api-url")||"",
 async request(payload){if(!this.api)throw Error("Enter the Apps Script API URL first.");const r=await fetch(this.api,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload)});const d=await r.json().catch(()=>({ok:false,message:"Invalid API response"}));return d;},
 async login(username,password,api){if(api){localStorage.setItem("pmt-api-url",api.trim());this.api=api.trim();}const d=await this.request({action:"adminLogin",username,password});if(!d.token)throw Error(d.message||"Login failed");sessionStorage.setItem("pmt-admin-token",d.token);sessionStorage.setItem("pmt-admin-user",JSON.stringify(d.user||{}));location.href="dashboard.html";},
 auth(){return sessionStorage.getItem("pmt-admin-token")},
 user(){try{return JSON.parse(sessionStorage.getItem("pmt-admin-user")||"{}")}catch(e){return {}}},
 logout(){const t=this.auth();this.request({action:"logout",token:t}).catch(()=>{});sessionStorage.removeItem("pmt-admin-token");sessionStorage.removeItem("pmt-admin-user");location.href="login.html"}
};

/* Mobile owner navigation. Desktop sidebar stays unchanged. */
(function(){
  if(location.pathname.endsWith('/login.html')||location.pathname.endsWith('/login'))return;
  function init(){
    const sidebar=document.querySelector('.admin-sidebar');
    const header=document.querySelector('.admin-top');
    if(!sidebar||!header||document.querySelector('.admin-mobile-menu'))return;
    const button=document.createElement('button');
    button.className='admin-mobile-menu';
    button.type='button';
    button.setAttribute('aria-label','Open owner menu');
    button.setAttribute('aria-expanded','false');
    button.innerHTML='<span></span><span></span><span></span>';
    header.insertBefore(button,header.firstChild);
    const overlay=document.createElement('div');overlay.className='admin-menu-overlay';
    document.body.appendChild(overlay);
    function close(){sidebar.classList.remove('mobile-open');overlay.classList.remove('open');button.setAttribute('aria-expanded','false');document.body.classList.remove('admin-menu-open');}
    function toggle(){const open=!sidebar.classList.contains('mobile-open');sidebar.classList.toggle('mobile-open',open);overlay.classList.toggle('open',open);button.setAttribute('aria-expanded',String(open));document.body.classList.toggle('admin-menu-open',open);}
    button.addEventListener('click',toggle);overlay.addEventListener('click',close);
    sidebar.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
