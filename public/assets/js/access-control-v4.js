/* PMT strict staff access v4: Owner=all, staff=explicit assigned permissions only. */
(function(){
  if(!/\/admin\//.test(location.pathname)||/login\.html$/i.test(location.pathname))return;
  document.documentElement.style.visibility='hidden';
  const PAGE={'dashboard.html':'dashboard','pos.html':'pos','billing.html':'billing','products.html':'products_view','product-editor.html':'products_edit','product-editor-v2.html':'products_edit','inventory.html':'inventory_view','orders.html':'orders_view','repairs.html':'repairs','customers.html':'customers','coupons.html':'coupons','feedback.html':'feedback','reviews.html':'feedback','analytics.html':'analytics','monthly-reports.html':'reports','monthly-report.html':'reports','reports.html':'reports','media.html':'media','uploads.html':'media','settings.html':'settings','security.html':'security','staff-access.html':'staff','editor.html':'website','website-editor.html':'website','banners.html':'banners','backup.html':'backups','users.html':'staff'};
  const HINTS=[['pos','pos'],['billing','billing'],['product-editor','products_edit'],['products','products_view'],['inventory','inventory_view'],['orders','orders_view'],['repairs','repairs'],['customers','customers'],['coupons','coupons'],['feedback','feedback'],['reviews','feedback'],['analytics','analytics'],['monthly-report','reports'],['reports','reports'],['media','media'],['uploads','media'],['security','security'],['settings','settings'],['staff-access','staff'],['users','staff'],['banners','banners'],['editor','website'],['website-editor','website'],['backup','backups']];
  const LANDING_ORDER=['dashboard','pos','billing','orders_view','repairs','customers','inventory_view','products_view','products_edit','website','banners','coupons','feedback','analytics','reports','media','settings','security','staff','backups'];
  const LANDING={dashboard:'dashboard.html',pos:'pos.html',billing:'billing.html',orders_view:'orders.html',repairs:'repairs.html',customers:'customers.html',inventory_view:'inventory.html',products_view:'products.html',products_edit:'product-editor-v2.html',website:'editor.html',banners:'banners.html',coupons:'coupons.html',feedback:'feedback.html',analytics:'analytics.html',reports:'reports.html',media:'media.html',settings:'settings.html',security:'security.html',staff:'staff-access.html',backups:'backup.html'};
  function stored(){try{return JSON.parse(sessionStorage.getItem('pmt-admin-user')||'null')}catch(e){return null}}
  function permissions(u){if(!u)return [];if(String(u.role)==='Owner')return ['*'];let p=u.permissions;if(typeof p==='string'){try{p=JSON.parse(p)}catch(e){p=[]}}return Array.isArray(p)?p.map(String):[]}
  function allowed(p,n){return p.indexOf('*')>=0||p.indexOf(n)>=0}
  function firstAllowed(p){for(const n of LANDING_ORDER)if(allowed(p,n))return LANDING[n];return null}
  function hide(el){const x=el.closest('li,.nav-item,.sidebar-item,.menu-item,.quick-action,.action-card,.dashboard-card,article,.card')||el;x.style.setProperty('display','none','important');x.setAttribute('aria-hidden','true')}
  function apply(u){
    const p=permissions(u);document.documentElement.dataset.pmtRole=String(u.role||'');
    document.querySelectorAll('a[href]').forEach(a=>{const h=String(a.getAttribute('href')||'');const f=h.split('?')[0].split('#')[0].split('/').pop().toLowerCase();if(PAGE[f]&&!allowed(p,PAGE[f])){hide(a);return}for(const z of HINTS){if(h.toLowerCase().includes(z[0]+'.html')&&!allowed(p,z[1])){hide(a);break}}});
    document.querySelectorAll('[data-permission],[data-pmt-permission]').forEach(el=>{const n=el.getAttribute('data-permission')||el.getAttribute('data-pmt-permission');if(n&&!allowed(p,n))hide(el)});
    document.querySelectorAll('[data-page-permission]').forEach(el=>{const n=el.getAttribute('data-page-permission');if(n&&!allowed(p,n))hide(el)});
    const current=location.pathname.split('/').pop().toLowerCase()||'dashboard.html',need=PAGE[current];
    if(need&&!allowed(p,need)){
      const target=firstAllowed(p);
      if(target&&target!==current){location.replace(target+'?access=redirected');return}
      sessionStorage.removeItem('pmt-admin-token');sessionStorage.removeItem('pmt-admin-user');location.replace('login.html?access=none');return;
    }
    if(allowed(p,'staff')){const host=document.querySelector('.admin-sidebar');if(host&&!host.querySelector('a[data-pmt-staff-link]')){const a=document.createElement('a');a.href='staff-access.html';a.dataset.pmtStaffLink='1';a.textContent='Staff & Access';host.appendChild(a)}}else document.querySelectorAll('a[href*="staff-access.html"]').forEach(hide);
    document.documentElement.style.visibility='visible';
  }
  async function boot(){
    const token=sessionStorage.getItem('pmt-admin-token');
    if(!token){location.replace('login.html');return}
    let u=stored();
    try{if(typeof window.pmtGet==='function'){const d=await window.pmtGet('myPermissions');if(d&&d.user)u=d.user}}catch(e){}
    if(!u){sessionStorage.removeItem('pmt-admin-token');sessionStorage.removeItem('pmt-admin-user');location.replace('login.html');return}
    u.permissions=permissions(u);sessionStorage.setItem('pmt-admin-user',JSON.stringify(u));window.PMT_ADMIN_USER=u;apply(u)
  }
  window.PMT_ACCESS_V4={refresh:boot,has:function(n){const u=stored();return !!u&&allowed(permissions(u),n)},landing:function(){const u=stored();return u&&firstAllowed(permissions(u))}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();