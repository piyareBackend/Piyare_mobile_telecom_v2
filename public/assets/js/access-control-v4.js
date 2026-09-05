/* PMT staff access: one controller, no redirect loop, no forced reload. */
(function(){
  if(!/\/admin\//.test(location.pathname)||/login\.html$/i.test(location.pathname))return;
  document.documentElement.style.visibility='hidden';
  const PAGE={dashboard:'dashboard',pos:'pos',billing:'billing',products:'products_view','product-editor':'products_edit','product-editor-v2':'products_edit',inventory:'inventory_view',orders:'orders_view',repairs:'repairs',customers:'customers',coupons:'coupons',feedback:'feedback',reviews:'feedback',analytics:'analytics','monthly-reports':'reports','monthly-report':'reports',reports:'reports',media:'media',uploads:'media',settings:'settings',security:'security','staff-access':'staff',users:'staff',editor:'website','website-editor':'website',banners:'banners',backup:'backups'};
  const ORDER=['dashboard','pos','billing','orders_view','repairs','customers','inventory_view','products_view','products_edit','website','banners','coupons','feedback','analytics','reports','media','settings','security','staff','backups'];
  const LANDING={dashboard:'dashboard.html',pos:'pos.html',billing:'billing.html',orders_view:'orders.html',repairs:'repairs.html',customers:'customers.html',inventory_view:'inventory.html',products_view:'products.html',products_edit:'product-editor-v2.html',website:'editor.html',banners:'banners.html',coupons:'coupons.html',feedback:'feedback.html',analytics:'analytics.html',reports:'reports.html',media:'media.html',settings:'settings.html',security:'security.html',staff:'staff-access.html',backups:'backup.html'};
  function user(){try{return JSON.parse(sessionStorage.getItem('pmt-admin-user')||'null')}catch(e){return null}}
  function perms(u){if(!u)return [];if(String(u.role)==='Owner')return ['*'];let p=u.permissions;if(typeof p==='string'){try{p=JSON.parse(p)}catch(e){p=[]}}return Array.isArray(p)?p.map(String):[]}
  function ok(p,n){return p.includes('*')||p.includes(n)}
  function first(p){for(const n of ORDER)if(ok(p,n))return LANDING[n];return null}
  function hide(el){const x=el.closest('li,.nav-item,.sidebar-item,.menu-item,.quick-action,.action-card,.dashboard-card,article,.card')||el;x.style.setProperty('display','none','important');x.setAttribute('aria-hidden','true')}
  function apply(u){
    const p=perms(u);document.documentElement.dataset.pmtRole=String(u.role||'');
    document.querySelectorAll('a[href]').forEach(a=>{const h=String(a.getAttribute('href')||'');const name=h.split('?')[0].split('#')[0].split('/').pop().toLowerCase().replace(/\.html$/,'');const need=PAGE[name];if(need&&!ok(p,need))hide(a)});
    document.querySelectorAll('[data-permission],[data-pmt-permission],[data-page-permission]').forEach(el=>{const n=el.getAttribute('data-permission')||el.getAttribute('data-pmt-permission')||el.getAttribute('data-page-permission');if(n&&!ok(p,n))hide(el)});
    const name=(location.pathname.split('/').pop()||'dashboard.html').toLowerCase().replace(/\.html$/,'');const need=PAGE[name];
    if(need&&!ok(p,need)){const target=first(p);if(target&&target!==location.pathname.split('/').pop())location.replace(target);else location.replace('login.html');return false}
    document.documentElement.style.visibility='visible';return true;
  }
  async function boot(){
    const token=sessionStorage.getItem('pmt-admin-token');if(!token){location.replace('login.html');return}
    let u=user();
    /* Never replace a valid locally established session with an empty backend response. */
    try{if(typeof window.pmtGet==='function'){const d=await window.pmtGet('myPermissions');if(d&&d.user)u=d.user}}catch(e){}
    if(!u){sessionStorage.removeItem('pmt-admin-token');sessionStorage.removeItem('pmt-admin-user');location.replace('login.html');return}
    u.permissions=perms(u);sessionStorage.setItem('pmt-admin-user',JSON.stringify(u));window.PMT_ADMIN_USER=u;apply(u)
  }
  window.PMT_ACCESS_V4={refresh:boot,has:function(n){const u=user();return !!u&&ok(perms(u),n)},landing:function(){const u=user();return u&&first(perms(u))}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();