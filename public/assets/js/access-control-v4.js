/* PMT staff access controller. Exact permissions, hidden navigation, hard route blocking. */
(function(){
  if(!/\/admin\//.test(location.pathname)||/\/admin\/login(?:\.html)?$/i.test(location.pathname))return;

  /* Never expose the admin UI while permissions are being resolved. */
  document.documentElement.style.visibility='hidden';
  var finished=false;
  function reveal(){if(finished)return;finished=true;document.documentElement.style.visibility='visible';}
  function deny(){reveal();location.replace('/admin/login.html?access=denied');}
  var PAGE={dashboard:'dashboard',pos:'pos',billing:'billing',products:'products_view','product-editor':'products_edit','product-editor-v2':'products_edit',inventory:'inventory_view','inventory-edit':'inventory_edit',orders:'orders_view','order-editor':'orders_edit',repairs:'repairs',customers:'customers',coupons:'coupons',feedback:'feedback',reviews:'feedback',analytics:'analytics','monthly-reports':'reports','monthly-report':'reports',reports:'reports',media:'media',uploads:'media',settings:'settings',security:'security','staff-access':'staff',users:'staff',editor:'website','website-editor':'website',banners:'banners',backup:'backups'};
  var ORDER=['pos','billing','products_view','inventory_view','orders_view','repairs','customers','coupons','feedback','analytics','reports','media','website','banners','settings','security','staff','backups','dashboard'];
  var LANDING={dashboard:'dashboard.html',pos:'pos.html',billing:'billing.html',orders_view:'orders.html',orders_edit:'orders.html',repairs:'repairs.html',customers:'customers.html',inventory_view:'inventory.html',inventory_edit:'inventory.html',products_view:'products.html',products_edit:'product-editor-v2.html',website:'editor.html',banners:'banners.html',coupons:'coupons.html',feedback:'feedback.html',analytics:'analytics.html',reports:'monthly-report.html',media:'media.html',settings:'settings.html',security:'security.html',staff:'staff-access.html',backups:'backup.html'};
  function user(){try{return JSON.parse(sessionStorage.getItem('pmt-admin-user')||'null')}catch(e){return null}}
  function perms(u){if(!u)return [];if(String(u.role)==='Owner')return ['*'];var p=u.permissions;if(typeof p==='string'){try{p=JSON.parse(p)}catch(e){p=[]}}return Array.isArray(p)?p.map(String):[]}
  function ok(p,n){return p.indexOf('*')>=0||p.indexOf(n)>=0}
  function first(p){for(var i=0;i<ORDER.length;i++)if(ok(p,ORDER[i]))return LANDING[ORDER[i]];return null}
  function hide(el){var x=el.closest('li,.nav-item,.sidebar-item,.menu-item,.quick-action,.action-card,.dashboard-card,article,.card')||el;x.style.setProperty('display','none','important');x.setAttribute('aria-hidden','true');x.setAttribute('tabindex','-1')}
  function pageName(h){return String(h||'').split('?')[0].split('#')[0].split('/').pop().toLowerCase().replace(/\.html$/,'')}
  function apply(u){
    var p=perms(u);document.documentElement.dataset.pmtRole=String(u.role||'');
    document.querySelectorAll('a[href]').forEach(function(a){var need=PAGE[pageName(a.getAttribute('href'))];if(need&&!ok(p,need))hide(a)});
    document.querySelectorAll('[data-permission],[data-pmt-permission],[data-page-permission]').forEach(function(el){var n=el.getAttribute('data-permission')||el.getAttribute('data-pmt-permission')||el.getAttribute('data-page-permission');if(n&&!ok(p,n))hide(el)});
    var current=pageName(location.pathname)||'dashboard';var need=PAGE[current];
    if(need&&!ok(p,need)){var target=first(p);if(target){location.replace('/admin/'+target)}else{deny()}return false}
    reveal();return true;
  }
  async function boot(){
    var token=sessionStorage.getItem('pmt-admin-token');
    if(!token){deny();return}
    var u=user();
    try{if(typeof window.pmtGet==='function'){var d=await window.pmtGet('myPermissions');if(d&&d.user)u=d.user}}catch(e){}
    if(!u){sessionStorage.removeItem('pmt-admin-token');sessionStorage.removeItem('pmt-admin-user');deny();return}
    u.permissions=perms(u);sessionStorage.setItem('pmt-admin-user',JSON.stringify(u));window.PMT_ADMIN_USER=u;apply(u);
  }
  window.PMT_ACCESS_V4={refresh:boot,has:function(n){var u=user();return !!u&&ok(perms(u),n)},landing:function(){var u=user();return u&&first(perms(u))}};
  try{if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot()}catch(e){deny()}
})();
