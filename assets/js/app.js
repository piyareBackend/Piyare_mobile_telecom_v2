/* PMT frontend bootstrap. No secrets belong here. */
(function(){
  const saved=localStorage.getItem("pmt-theme");
  const dark=saved==="dark" || (!saved && matchMedia("(prefers-color-scheme:dark)").matches);
  document.documentElement.toggleAttribute("data-theme",dark);
  const b=document.getElementById("themeToggle");
  if(b){b.textContent=dark?"☀️":"🌙";b.onclick=()=>{const d=document.documentElement.hasAttribute("data-theme");document.documentElement.toggleAttribute("data-theme",!d);localStorage.setItem("pmt-theme",d?"light":"dark");b.textContent=d?"🌙":"☀️";};}
  window.escapeHtml=function(s){const d=document.createElement("div");d.textContent=String(s??"");return d.innerHTML;};
  window.PMT_API_URL=localStorage.getItem("pmt-api-url")||window.PMT_PUBLIC_API_URL||"";

  function logoUrl(){return "/assets/logo.png?v=4";}
  function logoImage(size){
    const img=document.createElement("img");img.src=logoUrl();img.alt="Piyare Mobile Telecom logo";
    img.width=size;img.height=size;img.decoding="async";
    img.style.cssText=`width:${size}px;height:${size}px;object-fit:contain;display:block;`;
    return img;
  }
  function ensureLogoAndFavicon(){
    document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"]').forEach(el=>el.remove());
    const favicon=document.createElement("link");favicon.rel="icon";favicon.href=logoUrl();favicon.type="image/png";document.head.appendChild(favicon);
    document.querySelectorAll('link[rel="apple-touch-icon"]').forEach(el=>el.href=logoUrl());
    document.querySelectorAll("header .brand .mark").forEach(mark=>{mark.replaceChildren(logoImage(36));});
    document.querySelectorAll("footer .foot-brand").forEach(brand=>{
      const text=brand.textContent.replace(/📱/g,"").trim()||"Piyare Mobile Telecom";
      brand.replaceChildren(logoImage(28),document.createTextNode(" "+text));
    });
  }
  function ensureMobileNav(){
    document.querySelectorAll("header .nav").forEach(nav=>{
      const links=nav.querySelector(".navlinks");if(!links)return;
      let btn=nav.querySelector(".site-mobile-menu");
      if(!btn){
        btn=document.createElement("button");btn.className="site-mobile-menu";btn.type="button";
        btn.setAttribute("aria-label","Open navigation");btn.setAttribute("aria-expanded","false");
        btn.innerHTML="<span></span><span></span><span></span>";
        const cart=nav.querySelector(".navcart");nav.insertBefore(btn,cart||null);
      }
      let overlay=document.querySelector(".site-menu-overlay");
      if(!overlay){overlay=document.createElement("div");overlay.className="site-menu-overlay";document.body.appendChild(overlay);}
      if(btn.dataset.navBound)return;
      btn.dataset.navBound="1";
      const close=()=>{links.classList.remove("mobile-open");overlay.classList.remove("open");btn.setAttribute("aria-expanded","false");document.body.classList.remove("site-menu-open");};
      btn.addEventListener("click",()=>{
        const open=!links.classList.contains("mobile-open");
        links.classList.toggle("mobile-open",open);overlay.classList.toggle("open",open);
        btn.setAttribute("aria-expanded",String(open));document.body.classList.toggle("site-menu-open",open);
      });
      overlay.addEventListener("click",close);
      links.querySelectorAll("a").forEach(a=>a.addEventListener("click",close));
    });
  }
  function installMobileNavCSS(){
    if(document.getElementById("pmt-mobile-nav-css"))return;
    const style=document.createElement("style");style.id="pmt-mobile-nav-css";style.textContent=`
      .site-mobile-menu{display:none!important;background:rgba(255,255,255,.1);color:#fff;width:40px;height:40px;border-radius:10px;padding:8px;align-items:center;justify-content:center;flex-direction:column;gap:4px;flex:0 0 auto;position:relative;z-index:130}
      .site-mobile-menu span{display:block!important;width:21px;height:2px;background:currentColor;border-radius:2px}
      .site-menu-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:110}
      .site-menu-overlay.open{display:block}
      @media(max-width:800px){
        header .nav{position:relative;z-index:120}
        header .navlinks{display:none!important;position:absolute!important;left:12px!important;right:12px!important;top:calc(100% + 8px)!important;z-index:125!important;flex-direction:column!important;gap:3px!important;padding:10px!important;background:var(--surface)!important;color:var(--text)!important;border:1px solid var(--line)!important;border-radius:14px!important;box-shadow:0 18px 45px rgba(0,0,0,.28)!important}
        header .navlinks.mobile-open{display:flex!important}
        header .navlinks a{display:block!important;padding:12px!important;border-radius:9px!important;color:var(--text)!important}
        .site-mobile-menu{display:flex!important}
        body.site-menu-open{overflow:hidden}
      }
    `;document.head.appendChild(style);
  }
  installMobileNavCSS();ensureLogoAndFavicon();ensureMobileNav();
  document.addEventListener("DOMContentLoaded",()=>{installMobileNavCSS();ensureLogoAndFavicon();ensureMobileNav();});
  window.addEventListener("load",ensureMobileNav,{once:true});
})();

async function pmtGet(action,params={}){
  const api=localStorage.getItem("pmt-api-url")||window.PMT_PUBLIC_API_URL||"";if(!api)return null;
  const u=new URL(api);u.searchParams.set("action",action);
  const token=sessionStorage.getItem("pmt-admin-token")||"";if(token)u.searchParams.set("token",token);
  Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));
  const r=await fetch(u,{credentials:"omit"});const d=await r.json().catch(()=>({ok:false,message:"Invalid API response"}));
  if(d.ok===false&&d.message==="Unauthorized"){sessionStorage.removeItem("pmt-admin-token");if(location.pathname.includes("/admin/")&&!location.pathname.endsWith("login.html"))location.replace("login.html");}
  if(!r.ok)throw Error("API request failed");return d;
}
async function pmtPost(payload){
  const api=localStorage.getItem("pmt-api-url")||window.PMT_PUBLIC_API_URL||"";if(!api)throw Error("Apps Script API URL is not configured.");
  const token=sessionStorage.getItem("pmt-admin-token")||"";
  const r=await fetch(api,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({...payload,token})});
  const d=await r.json().catch(()=>({ok:false,message:"Invalid API response"}));
  if(!r.ok||d.ok===false){if(d.message==="Unauthorized"){sessionStorage.removeItem("pmt-admin-token");location.replace("login.html");}throw Error(d.message||"API request failed");}return d;
}
function pmtDeepMerge(a,b){if(!b)return a;for(const k of Object.keys(b)){if(b[k]&&typeof b[k]==="object"&&!Array.isArray(b[k])&&a[k])pmtDeepMerge(a[k],b[k]);else a[k]=b[k];}return a;}
async function loadSiteContent(){
  const local=JSON.parse(localStorage.getItem("pmt-content")||"null");
  let data=local?pmtDeepMerge(structuredClone(PMT_DEFAULT_CONTENT),local):structuredClone(PMT_DEFAULT_CONTENT);
  try{const remote=await pmtGet("content");if(remote?.content)data=pmtDeepMerge(data,remote.content);}catch(_){ }
  return data;
}