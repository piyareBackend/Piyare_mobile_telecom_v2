/* Public configuration. /api is a same-origin Cloudflare Worker proxy to the Apps Script backend. */
window.PMT_PUBLIC_API_URL="/api";
/* Temporary shop-owner WhatsApp destination for new-order handoff. */
window.PMT_OWNER_WHATSAPP="917366815917";
/* Keep the mobile menu beside the brand, matching the mobile header design. */
(function(){
  const s=document.createElement("style");
  s.textContent="@media(max-width:800px){header .nav .site-mobile-menu{order:-1!important;margin-right:4px!important}header .nav .brand{order:0!important}header .nav .navlinks{order:1!important}header .nav .navcart{order:2!important}}";
  document.head.appendChild(s);
  function initMobileNav(){
    document.querySelectorAll("header .nav").forEach(function(nav){
      const links=nav.querySelector(".navlinks");
      if(!links||nav.querySelector(".site-mobile-menu"))return;
      const button=document.createElement("button");
      button.type="button";button.className="site-mobile-menu";button.setAttribute("aria-label","Open navigation");button.setAttribute("aria-expanded","false");
      button.innerHTML="<span></span><span></span><span></span>";
      const overlay=document.createElement("div");overlay.className="site-menu-overlay";document.body.appendChild(overlay);
      const close=()=>{links.classList.remove("mobile-open");overlay.classList.remove("open");document.body.classList.remove("site-menu-open");button.setAttribute("aria-expanded","false");};
      button.onclick=()=>{const open=!links.classList.contains("mobile-open");links.classList.toggle("mobile-open",open);overlay.classList.toggle("open",open);document.body.classList.toggle("site-menu-open",open);button.setAttribute("aria-expanded",String(open));};
      overlay.onclick=close;links.querySelectorAll("a").forEach(a=>a.addEventListener("click",close));
      nav.insertBefore(button,nav.querySelector(".navcart")||null);
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initMobileNav);else initMobileNav();
})();