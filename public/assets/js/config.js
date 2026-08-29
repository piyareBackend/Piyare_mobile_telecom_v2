/* Public configuration. /api is a same-origin Cloudflare Worker proxy to the Apps Script backend. */
window.PMT_PUBLIC_API_URL="/api";
window.PMT_OWNER_WHATSAPP="917366815917";
(function(){
  const s=document.createElement("style");
  s.textContent=`@media(max-width:800px){header .nav{position:relative;display:flex!important;align-items:center!important;gap:8px!important}header .nav .site-mobile-menu{display:flex!important;order:-1!important;position:relative!important;z-index:130!important;width:40px!important;height:40px!important;min-width:40px!important;padding:8px!important;margin:0 4px 0 0!important;align-items:center!important;justify-content:center!important;flex-direction:column!important;gap:4px!important;border:1px solid var(--line)!important;border-radius:10px!important;background:var(--surface)!important;color:var(--text)!important;cursor:pointer!important}header .nav .site-mobile-menu span{display:block!important;width:20px!important;height:2px!important;background:currentColor!important;border-radius:2px!important}header .nav .brand{order:0!important;min-width:0!important}header .nav .navcart{order:2!important;margin-left:auto!important}header .nav .navlinks{display:none!important;position:fixed!important;left:12px!important;right:12px!important;top:68px!important;z-index:125!important;flex-direction:column!important;gap:2px!important;padding:10px!important;background:var(--surface)!important;border:1px solid var(--line)!important;border-radius:14px!important;box-shadow:0 18px 45px rgba(0,0,0,.25)!important}header .nav .navlinks.mobile-open{display:flex!important}header .nav .navlinks a{display:block!important;padding:13px 14px!important;color:var(--text)!important;text-decoration:none!important}.site-menu-overlay{position:fixed!important;inset:0!important;z-index:120!important;background:rgba(0,0,0,.18)!important;opacity:0!important;pointer-events:none!important;display:block!important}.site-menu-overlay.open{opacity:1!important;pointer-events:auto!important}body.site-menu-open{overflow:hidden!important}}`;
  document.head.appendChild(s);
  function initMobileNav(){
    document.querySelectorAll("header .nav").forEach(function(nav){
      const links=nav.querySelector(".navlinks"); if(!links)return;
      let button=nav.querySelector(".site-mobile-menu");
      let overlay=document.querySelector(".site-menu-overlay[data-pmt-menu]");
      if(!button){button=document.createElement("button");button.type="button";button.className="site-mobile-menu";button.setAttribute("aria-label","Open navigation");button.setAttribute("aria-expanded","false");button.innerHTML="<span></span><span></span><span></span>";nav.insertBefore(button,nav.firstElementChild);}
      if(!overlay){overlay=document.createElement("div");overlay.className="site-menu-overlay";overlay.dataset.pmtMenu="1";document.body.appendChild(overlay);}
      if(button.dataset.bound)return;button.dataset.bound="1";
      const close=()=>{links.classList.remove("mobile-open");overlay.classList.remove("open");document.body.classList.remove("site-menu-open");button.setAttribute("aria-expanded","false");};
      button.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();const open=!links.classList.contains("mobile-open");links.classList.toggle("mobile-open",open);overlay.classList.toggle("open",open);document.body.classList.toggle("site-menu-open",open);button.setAttribute("aria-expanded",String(open));});
      overlay.addEventListener("click",close);links.querySelectorAll("a").forEach(a=>a.addEventListener("click",close));
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initMobileNav);else initMobileNav();
  window.addEventListener("load",initMobileNav);
})();