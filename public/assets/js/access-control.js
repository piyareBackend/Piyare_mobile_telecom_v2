/* PMT granular admin access controller. */
(function(){
  if(!/\/admin\//.test(location.pathname)||/login\.html$/i.test(location.pathname))return;
  const PAGE_PERM={'dashboard.html':'dashboard','pos.html':'pos','billing.html':'billing','products.html':'products_view','product-editor.html':'products_edit','product-editor-v2.html':'products_edit','inventory.html':'inventory_view','orders.html':'orders_view','repairs.html':'repairs','customers.html':'customers','coupons.html':'coupons','feedback.html':'feedback','reviews.html':'feedback','analytics.html':'analytics','monthly-reports.html':'reports','monthly-report.html':'reports','reports.html':'reports','media.html':'media','uploads.html':'media','security.html':'security','settings.html':'settings','staff-access.html':'staff'};
  const LINK_PERM=[[/\/admin\/(dashboard\.html)?$/,'dashboard'],[/pos\.html/,'pos'],[/billing\.html/,'billing'],[/products\.html|product-editor/,'products_view'],[/inventory\.html/,'inventory_view'],[/orders\.html/,'orders_view'],[/repairs\.html/,'repairs'],[/customers\.html/,'customers'],[/coupons\.html/,'coupons'],[/feedback\.html|reviews\.html/,'feedback'],[/analytics\.html/,'analytics'],[/monthly-report|reports\.html/,'reports'],[/media\.html|uploads\.html/,'media'],[/settings\.html/,'settings'],[/security\.html/,'security'],[/staff-access\.html/,'staff']];
  const ROLE_DEFAULTS={
    Support:['dashboard','pos','billing','orders_view','repairs','customers','inventory_view'],
    Editor:['dashboard','website','banners','products_view','products_edit','media','feedback'],
    Manager:['dashboard','pos','billing','products_view','products_edit','inventory_view','inventory_edit','orders_view','orders_edit','repairs','coupons','customers','feedback','analytics','reports','media','website','banners'],
    Owner:['*']
  };
  function token(){return sessionStorage.getItem('pmt-admin-token')||'';}
  function permissionsFor(user){
    if(!user)return [];
    if(String(user.role)==='Owner')return ['*'];
    if(Array.isArray(user.permissions)&&user.permissions.length)return user.permissions;
    if(typeof user.permissions==='string'){try{const p=JSON.parse(user.permissions);if(Array.isArray(p)&&p.length)return p;}catch(_){} }
    return (ROLE_DEFAULTS[String(user.role)]||[]).slice();
  }
  function allowed(perms,p){return perms.indexOf('*')>=0||perms.indexOf(p)>=0;}
  function saveUser(u){try{u.permissions=permissionsFor(u);sessionStorage.setItem('pmt-admin-user',JSON.stringify(u));}catch(_){}window.PMT_ADMIN_USER=u;}
  function apply(user){
    if(!user)return;
    const perms=permissionsFor(user);user.permissions=perms;
    document.documentElement.dataset.pmtRole=String(user.role||'');
    document.querySelectorAll('a[href]').forEach(a=>{const href=String(a.getAttribute('href')||'');for(const pair of LINK_PERM){if(pair[0].test(href)&&!allowed(perms,pair[1])){const item=a.closest('li,.nav-item,.sidebar-item,.menu-item');(item||a).style.display='none';break;}}});
    const host=document.querySelector('.admin-sidebar');
    if(host&&allowed(perms,'staff')&&!host.querySelector('a[data-pmt-staff-access]')){const a=document.createElement('a');a.href='staff-access.html';a.dataset.pmtStaffAccess='1';a.textContent='Staff & Access';host.appendChild(a);}
    if(host&&!allowed(perms,'staff'))host.querySelectorAll('a[href*="staff-access.html"]').forEach(a=>a.style.display='none');
    const current=location.pathname.split('/').pop()||'dashboard.html',needed=PAGE_PERM[current];
    if(needed&&!allowed(perms,needed)){location.replace('dashboard.html?access=denied');return;}
    if(current==='dashboard.html'&&new URLSearchParams(location.search).get('access')==='denied'){const box=document.createElement('div');box.textContent='You do not have permission to open that page.';box.style.cssText='position:fixed;top:18px;right:18px;z-index:99999;padding:12px 16px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;color:#111827;box-shadow:0 10px 30px rgba(0,0,0,.12)';document.body.appendChild(box);setTimeout(()=>box.remove(),3500);}
  }
  async function boot(){
    if(!token()){location.replace('login.html');return;}
    let user=null;
    try{const d=await window.pmtGet('myPermissions');if(d&&d.user)user=d.user;}catch(e){}
    if(!user){try{user=JSON.parse(sessionStorage.getItem('pmt-admin-user')||'null');}catch(_){} }
    if(user){saveUser(user);apply(user);}
    else{sessionStorage.removeItem('pmt-admin-token');sessionStorage.removeItem('pmt-admin-user');location.replace('login.html');}
  }
  window.PMT_ACCESS={refresh:boot,user:()=>{try{return JSON.parse(sessionStorage.getItem('pmt-admin-user')||'null');}catch(_){return null;}},has:p=>{const u=window.PMT_ACCESS.user();return !!u&&allowed(permissionsFor(u),p)}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
