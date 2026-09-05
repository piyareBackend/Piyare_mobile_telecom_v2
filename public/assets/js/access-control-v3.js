/* PMT staff access v3: assigned pages only. */
(function(){
  if(!/\/admin\//.test(location.pathname)||/login\.html$/i.test(location.pathname))return;
  const PAGE_PERM={
    'dashboard.html':'dashboard','pos.html':'pos','billing.html':'billing','products.html':'products_view',
    'product-editor.html':'products_edit','product-editor-v2.html':'products_edit','inventory.html':'inventory_view',
    'orders.html':'orders_view','repairs.html':'repairs','customers.html':'customers','coupons.html':'coupons',
    'feedback.html':'feedback','reviews.html':'feedback','analytics.html':'analytics','monthly-reports.html':'reports',
    'monthly-report.html':'reports','reports.html':'reports','media.html':'media','uploads.html':'media',
    'security.html':'security','settings.html':'settings','staff-access.html':'staff','editor.html':'website','banners.html':'banners',
    'homepage.html':'website','notifications.html':'dashboard','alerts.html':'inventory_view','seo.html':'website',
    'backup.html':'backups','users.html':'staff'
  };
  const LINK_PERM=[
    [/\/admin\/(dashboard\.html)?$/,'dashboard'],[/pos\.html/,'pos'],[/billing\.html/,'billing'],
    [/products\.html/,'products_view'],[/product-editor/,'products_edit'],[/inventory\.html|alerts\.html/,'inventory_view'],
    [/orders\.html/,'orders_view'],[/repairs\.html/,'repairs'],[/customers\.html/,'customers'],[/coupons\.html/,'coupons'],
    [/feedback\.html|reviews\.html/,'feedback'],[/analytics\.html/,'analytics'],[/monthly-report|monthly-reports|reports\.html/,'reports'],
    [/media\.html|uploads\.html/,'media'],[/settings\.html/,'settings'],[/security\.html/,'security'],
    [/staff-access\.html|users\.html/,'staff'],[/editor\.html|homepage\.html|seo\.html/,'website'],[/banners\.html/,'banners'],
    [/notifications\.html/,'dashboard'],[/backup\.html/,'backups']
  ];
  const ROLE_DEFAULTS={
    Support:['dashboard','pos','billing','orders_view','repairs','customers','inventory_view'],
    Editor:['dashboard','website','banners','products_view','products_edit','media','feedback'],
    Manager:['dashboard','pos','billing','products_view','products_edit','inventory_view','inventory_edit','orders_view','orders_edit','repairs','coupons','customers','feedback','analytics','reports','media','website','banners'],
    Owner:['*']
  };
  const LANDING_ORDER=['dashboard','pos','billing','orders_view','repairs','customers','inventory_view','products_view','website','banners','coupons','feedback','analytics','reports','media','settings','security','staff','backups'];
  const LANDING_PAGE={dashboard:'dashboard.html',pos:'pos.html',billing:'billing.html',orders_view:'orders.html',repairs:'repairs.html',customers:'customers.html',inventory_view:'inventory.html',products_view:'products.html',website:'editor.html',banners:'banners.html',coupons:'coupons.html',feedback:'feedback.html',analytics:'analytics.html',reports:'reports.html',media:'media.html',settings:'settings.html',security:'security.html',staff:'staff-access.html',backups:'backup.html'};
  function user(){try{return JSON.parse(sessionStorage.getItem('pmt-admin-user')||'null')}catch(_){return null}}
  function perms(u){
    if(!u)return [];
    if(String(u.role)==='Owner')return ['*'];
    let p=u.permissions;
    if(typeof p==='string'){try{p=JSON.parse(p)}catch(_){p=[]}}
    return Array.isArray(p)&&p.length?p:(ROLE_DEFAULTS[String(u.role)]||[]).slice();
  }
  function ok(p,n){return p.indexOf('*')>=0||p.indexOf(n)>=0}
  function firstAllowed(p){for(const n of LANDING_ORDER)if(ok(p,n))return LANDING_PAGE[n];return 'login.html'}
  function hide(a){
    let el=a.closest('li,.nav-item,.sidebar-item,.menu-item,.quick-action,.action-card,.dashboard-card,article,.card');
    if(!el)el=a;
    el.style.setProperty('display','none','important');
  }
  function apply(u){
    const p=perms(u);document.documentElement.dataset.pmtRole=String(u.role||'');
    document.querySelectorAll('a[href]').forEach(a=>{
      const href=String(a.getAttribute('href')||'');
      for(const x of LINK_PERM){if(x[0].test(href)){if(!ok(p,x[1]))hide(a);break;}}
    });
    document.querySelectorAll('[data-permission],[data-pmt-permission]').forEach(el=>{
      const n=el.getAttribute('data-permission')||el.getAttribute('data-pmt-permission');
      if(n&&!ok(p,n))el.style.setProperty('display','none','important');
    });
    const current=location.pathname.split('/').pop()||'dashboard.html',need=PAGE_PERM[current];
    if(need&&!ok(p,need)){
      const target=firstAllowed(p);
      if(target!==current)location.replace(target+'?access=redirected');
      else location.replace('login.html');
      return false;
    }
    return true;
  }
  async function boot(){
    if(!sessionStorage.getItem('pmt-admin-token')){location.replace('login.html');return}
    let u=null;
    try{if(typeof window.pmtGet==='function'){const d=await window.pmtGet('myPermissions');if(d&&d.user)u=d.user}}catch(_){ }
    u=u||user();
    if(!u){sessionStorage.removeItem('pmt-admin-token');sessionStorage.removeItem('pmt-admin-user');location.replace('login.html');return}
    if(String(u.role)==='Owner')u.permissions=['*'];
    else u.permissions=perms(u);
    sessionStorage.setItem('pmt-admin-user',JSON.stringify(u));window.PMT_ADMIN_USER=u;
    apply(u);
  }
  window.PMT_ACCESS_V3={refresh:boot,has:function(n){const u=user();return !!u&&ok(perms(u),n)},landing:function(){const u=user();return firstAllowed(perms(u))}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();