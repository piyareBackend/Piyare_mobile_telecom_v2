/* PMT frontend bootstrap. No secrets belong here. */
(function(){
  const root=document.documentElement;
  const saved=localStorage.getItem("pmt-theme");
  const prefersDark=window.matchMedia&&matchMedia("(prefers-color-scheme:dark)").matches;
  function applyTheme(mode){
    const dark=mode==="dark";
    root.setAttribute("data-theme",dark?"dark":"light");
    root.style.colorScheme=dark?"dark":"light";
    document.querySelectorAll(".theme-toggle").forEach(b=>{
      b.textContent=dark?"☀️":"🌙";
      b.setAttribute("aria-pressed",String(dark));
      b.title=dark?"Switch to light mode":"Switch to dark mode";
    });
  }
  applyTheme(saved || (prefersDark?"dark":"light"));
  function bindThemeButtons(){
    document.querySelectorAll(".theme-toggle").forEach(b=>{
      if(b.dataset.themeBound)return;
      b.dataset.themeBound="1";
      b.onclick=()=>{
        const next=root.getAttribute("data-theme")==="dark"?"light":"dark";
        localStorage.setItem("pmt-theme",next);
        applyTheme(next);
      };
    });
  }
  bindThemeButtons();
  new MutationObserver(bindThemeButtons).observe(document.documentElement,{childList:true,subtree:true});
  const style=document.createElement("style");
  style.textContent=`
    [data-theme="dark"] body{background:var(--cream);color:var(--text)}
    [data-theme="dark"] .card-img{background:linear-gradient(135deg,#20243a,#28251d)}
    [data-theme="dark"] .form-card,[data-theme="dark"] .upload-box{border-color:var(--line)}
    [data-theme="dark"] input,[data-theme="dark"] select,[data-theme="dark"] textarea{color-scheme:dark}
    [data-theme="dark"] .panel,[data-theme="dark"] .card,[data-theme="dark"] .cms-section,[data-theme="dark"] .stat,[data-theme="dark"] .kpi{box-shadow:0 10px 28px rgba(0,0,0,.18)}
    .brand .mark img{display:block;width:100%;height:100%;object-fit:cover}
    .site-mobile-menu{display:none}
    .site-menu-overlay{display:none}
    .footer-socials{display:flex;align-items:center;gap:10px;margin-top:18px;flex-wrap:wrap}
    .footer-socials a{width:38px;height:38px;border:1px solid var(--line);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,.04);color:inherit;transition:transform .15s,background .15s}
    .footer-socials a:hover{transform:translateY(-2px);background:rgba(255,255,255,.09)}
    .footer-socials svg{width:19px;height:19px;display:block;fill:currentColor}
    @media(max-width:800px){
      header .nav{position:relative}
      header .navlinks{display:none!important;position:absolute;left:12px;right:12px;top:calc(100% + 10px);z-index:120;flex-direction:column;gap:4px;padding:10px;background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:0 18px 45px rgba(0,0,0,.25)}
      header .navlinks.mobile-open{display:flex!important}
      header .navlinks a{padding:11px 12px;border-radius:9px}
      .site-mobile-menu{display:flex;flex-direction:column;justify-content:center;gap:4px;width:40px;height:40px;padding:8px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--text);flex:0 0 auto}
      .site-mobile-menu span{height:2px;width:20px;background:currentColor;border-radius:2px;display:block}
      .site-menu-overlay{position:fixed;inset:0;z-index:110;background:rgba(0,0,0,.18);opacity:0;pointer-events:none;transition:opacity .18s ease;display:block}
      .site-menu-overlay.open{opacity:1;pointer-events:auto}
      body.site-menu-open{overflow:hidden}
      .footer-socials{margin-top:14px}
    }
  `;
  document.head.appendChild(style);
  window.escapeHtml=function(s){const d=document.createElement("div");d.textContent=String(s??"");return d.innerHTML;};
  window.PMT_API_URL=localStorage.getItem("pmt-api-url")||window.PMT_PUBLIC_API_URL||"";
})();

const PMT_ADMIN_CACHE_TTL=15000;
function pmtAdminCacheKey(action,params){return "pmt-admin-cache:"+action+":"+JSON.stringify(params||{});}
function pmtClearAdminCache(){try{Object.keys(sessionStorage).filter(k=>k.indexOf("pmt-admin-cache:")===0).forEach(k=>sessionStorage.removeItem(k));}catch(_){} }

async function pmtGet(action,params={}){
  const api=localStorage.getItem("pmt-api-url")||window.PMT_PUBLIC_API_URL||"";
  if(!api)return null;
  const isAdminRead=["dashboard","analytics","homepage","products","orders","repairs","coupons","reviews","notifications","lowStock","users","feedback","activity","customers"].indexOf(action)>=0;
  const cacheKey=isAdminRead?pmtAdminCacheKey(action,params):null;
  if(isAdminRead){try{const c=JSON.parse(sessionStorage.getItem(cacheKey)||"null");if(c&&Date.now()-Number(c.ts)<PMT_ADMIN_CACHE_TTL)return c.data;}catch(_){} }
  const u=new URL(api);u.searchParams.set("action",action);
  const token=sessionStorage.getItem("pmt-admin-token")||"";if(token)u.searchParams.set("token",token);
  Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));
  const r=await fetch(u,{credentials:"omit",cache:"no-store"});
  const d=await r.json().catch(()=>({ok:false,message:"Invalid API response"}));
  if(d.ok===false&&d.message==="Unauthorized"){
    sessionStorage.removeItem("pmt-admin-token");
    if(location.pathname.includes("/admin/")&&!location.pathname.endsWith("login.html"))location.replace("login.html");
  }
  if(!r.ok)throw Error("API request failed");
  if(isAdminRead&&d?.ok!==false){try{sessionStorage.setItem(cacheKey,JSON.stringify({ts:Date.now(),data:d}));}catch(_){} }
  return d;
}
async function pmtPost(payload){
  const api=localStorage.getItem("pmt-api-url")||window.PMT_PUBLIC_API_URL||"";
  if(!api)throw Error("Apps Script API URL is not configured.");
  const token=sessionStorage.getItem("pmt-admin-token")||"";
  const r=await fetch(api,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({...payload,token})});
  const d=await r.json().catch(()=>({ok:false,message:"Invalid API response"}));
  if(!r.ok||d.ok===false){
    if(d.message==="Unauthorized"&&location.pathname.includes("/admin/")){
      sessionStorage.removeItem("pmt-admin-token");location.replace("login.html");
    }
    throw Error(d.message||"API request failed");
  }
  pmtClearAdminCache();
  return d;
}

function pmtDeepMerge(a,b){
  if(!b)return a;
  for(const k of Object.keys(b)){
    if(b[k]&&typeof b[k]==="object"&&!Array.isArray(b[k])&&a[k])pmtDeepMerge(a[k],b[k]);
    else a[k]=b[k];
  }
  return a;
}

let PMT_CONTENT_DATA=null;
let PMT_CONTENT_REFRESH=null;
const PMT_CONTENT_CACHE_KEY="pmt-content-cache-v2";
const PMT_CONTENT_TTL=5*60*1000;

function pmtReadContentCache(){
  try{
    const cached=JSON.parse(localStorage.getItem(PMT_CONTENT_CACHE_KEY)||"null");
    return cached?.content||null;
  }catch(_){return null;}
}
function pmtGetInitialContent(){
  if(PMT_CONTENT_DATA)return PMT_CONTENT_DATA;
  const cached=pmtReadContentCache();
  PMT_CONTENT_DATA=cached
    ? pmtDeepMerge(structuredClone(PMT_DEFAULT_CONTENT),cached)
    : structuredClone(PMT_DEFAULT_CONTENT);
  return PMT_CONTENT_DATA;
}
async function pmtRefreshContent(){
  if(PMT_CONTENT_REFRESH)return PMT_CONTENT_REFRESH;
  PMT_CONTENT_REFRESH=(async()=>{
    try{
      const remote=await pmtGet("content");
      if(remote?.content){
        PMT_CONTENT_DATA=pmtDeepMerge(structuredClone(PMT_DEFAULT_CONTENT),remote.content);
        localStorage.setItem(PMT_CONTENT_CACHE_KEY,JSON.stringify({ts:Date.now(),content:remote.content}));
        window.dispatchEvent(new CustomEvent("pmt-content-updated"));
      }
    }catch(_){ }
    return PMT_CONTENT_DATA;
  })().finally(()=>{PMT_CONTENT_REFRESH=null;});
  return PMT_CONTENT_REFRESH;
}
function loadSiteContent(){
  const data=pmtGetInitialContent();
  let stale=true;
  try{
    const cached=JSON.parse(localStorage.getItem(PMT_CONTENT_CACHE_KEY)||"null");
    stale=!cached?.ts || Date.now()-Number(cached.ts)>PMT_CONTENT_TTL;
  }catch(_){ }
  if(stale)pmtRefreshContent();
  return Promise.resolve(data);
}

(function(){
  function svg(kind){
    const paths={
      facebook:'<path d="M20 10.1C20 4.55 15.52 0 10 0S0 4.55 0 10.1c0 5.03 3.66 9.2 8.44 9.98v-7.06H5.9v-2.92h2.54V7.88c0-2.55 1.5-3.96 3.82-3.96 1.1 0 2.25.2 2.25.2v2.5h-1.27c-1.25 0-1.64.78-1.64 1.58v1.9h2.79l-.45 2.92H11.6v7.06C16.34 19.3 20 15.13 20 10.1Z"/>',
      instagram:'<rect x="2" y="2" width="16" height="16" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="10" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="15.5" cy="4.7" r="1.1"/>',
      threads:'<path d="M14.7 8.5c-.32-2.13-1.55-3.42-3.7-3.42-2.3 0-3.75 1.48-3.75 3.82 0 2.8 1.86 4.4 4.65 4.4 1.43 0 2.65-.42 3.5-1.25.1 2.05-1.05 3.37-3.2 3.37-1.52 0-2.5-.56-2.88-1.67H7.1c.42 2.18 2.2 3.55 5.03 3.55 3.52 0 5.5-2.05 5.5-5.72 0-3.2-1.1-5.48-3.38-6.75C13.15 3.7 11.8 3.1 10.15 3.1 6.15 3.1 3.6 5.4 3.6 9.02c0 3.95 2.52 6.35 6.55 6.35 2.9 0 5.12-1.27 5.98-3.53-1.1-.85-2.33-1.3-3.58-1.3-1.55 0-2.62.63-2.96 1.76-.84-.5-1.28-1.28-1.28-2.4 0-1.6 1.02-2.57 2.7-2.57 1.5 0 2.7.7 3.69 2.08Z"/>',
      x:'<path d="M3 2h4.5l3.05 4.45L14.3 2H17l-5.25 6.02L17.8 18h-4.5l-3.4-4.95L5.3 18H2.6l5.58-6.4L3 2Zm3.1 1.5 7.95 13h1.55l-7.95-13H6.1Z"/>'
    };return '<svg viewBox="0 0 20 20" aria-hidden="true">'+paths[kind]+'</svg>';
  }
  function initHeader(){
    const nav=document.querySelector("header .nav"),links=nav?.querySelector(".navlinks");
    if(!nav||!links||nav.querySelector(".site-mobile-menu"))return;
    const btn=document.createElement("button");btn.className="site-mobile-menu";btn.type="button";btn.setAttribute("aria-label","Open menu");btn.setAttribute("aria-expanded","false");btn.innerHTML="<span></span><span></span><span></span>";
    const cart=nav.querySelector(".navcart");nav.insertBefore(btn,cart||null);
    const overlay=document.createElement("div");overlay.className="site-menu-overlay";document.body.appendChild(overlay);
    function close(){links.classList.remove("mobile-open");overlay.classList.remove("open");btn.setAttribute("aria-expanded","false");document.body.classList.remove("site-menu-open");}
    function toggle(){const open=!links.classList.contains("mobile-open");links.classList.toggle("mobile-open",open);overlay.classList.toggle("open",open);btn.setAttribute("aria-expanded",String(open));document.body.classList.toggle("site-menu-open",open);}
    btn.addEventListener("click",toggle);overlay.addEventListener("click",close);links.querySelectorAll("a").forEach(a=>a.addEventListener("click",close));
  }
  function initSocials(){
    document.querySelectorAll("footer .foot-grid").forEach(grid=>{
      if(grid.querySelector(".footer-socials"))return;
      const box=document.createElement("div");box.className="footer-socials";box.setAttribute("aria-label","Social media");
      const defaults={facebook:"https://www.facebook.com/",instagram:"https://www.instagram.com/",threads:"https://www.threads.net/",x:"https://x.com/"};
      Object.entries(defaults).forEach(([key,url])=>{const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";a.setAttribute("aria-label",key==="x"?"X (Twitter)":key[0].toUpperCase()+key.slice(1));a.innerHTML=svg(key);box.appendChild(a);});
      grid.firstElementChild?.appendChild(box);
    });
  }
  function init(){initHeader();initSocials();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
