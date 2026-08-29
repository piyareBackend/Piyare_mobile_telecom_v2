/* Public configuration. /api is a same-origin Cloudflare Worker proxy to the Apps Script backend. */
window.PMT_PUBLIC_API_URL="/api";
/* Temporary shop-owner WhatsApp destination for new-order handoff. */
window.PMT_OWNER_WHATSAPP="917366815917";
/* Keep the mobile menu beside the brand, matching the mobile header design. */
(function(){const s=document.createElement("style");s.textContent="@media(max-width:800px){header .nav .site-mobile-menu{order:-1!important;margin-right:4px!important}header .nav .brand{order:0!important}header .nav .navlinks{order:1!important}header .nav .navcart{order:2!important}}";document.head.appendChild(s);})();
