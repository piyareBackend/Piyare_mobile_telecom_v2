/* PMT staff access controller. Exact permissions, hidden navigation, hard route blocking. */
(function(){
  if(!/\/admin\//.test(location.pathname)||/\/admin\/login(?:\.html)?$/i.test(location.pathname))return;

  var PAGE={dashboard:'dashboard',pos:'pos',billing:'billing',products:'products_view','product-editor':'products_edit','product-editor-v2':'products_edit',inventory:'inventory_view','inventory-edit':'inventory_edit',orders:'orders_view','order-editor':'orders_edit',repairs:'repairs',customers:'customers',coupons:'coupons',feedback:'feedback',reviews:'feedback',analytics:'analytics','monthly-reports':'reports','monthly-report':'reports',reports:'reports',media:'media',uploads:'media',settings:'settings',security:'security','staff-access':'staff',users:'staff',editor:'website','website-editor':'website',banners:'banners',backup:'backups'};
  var ORDER=['pos','billing','products_view','inventory_view','orders_view','repairs','customers','coupons','feedback','analytics','reports','media','website','banners','settings','security','staff','backups','dashboard'];
  var LANDING={dashboard:'dashboard.html',pos:'pos.html',billing:'billing.html',orders_view:'orders.html',orders_edit:'orders.html',repairs:'repairs.html',customers:'customers.html',inventory_view:'inventory.html',inventory_edit:'inventory.html',products_view:'products.html',products_edit:'product-editor-v2.html',website:'editor.html',banners:'banners.html',coupons:'coupons.html',feedback:'feedback.html',analytics:'analytics.html',reports:'monthly-report.html',media:'media.html',settings:'settings.html',security:'security.html',staff:'staff-access.html',backups:'backup.html'};
  var resolved=false,observer=null,scheduled=false;

  document.documentElement.style.visibility='hidden';
  function reveal(){document.documentElement.style.visibility='visible';}
  function deny(){reveal();location.replace('/admin/login.html?access=denied');}
  function user(){try{return JSON.parse(sessionStorage.getItem('pmt-admin-user')||'null')}catch(e){return null}}
  function perms(u){
    if(!u)return [];
    if(String(u.role)==='Owner')return ['*'];
    var p=u.permissions;
    if(typeof p==='string'){try{p=JSON.parse(p)}catch(e){p=[]}}
    return Array.isArray(p)?p.map(String):[];
  }
  function ok(p,n){
    if(p.indexOf('*')>=0||p.indexOf(n)>=0)return true;
    if(n==='products_view'&&p.indexOf('products_edit')>=0)return true;
    if(n==='inventory_view'&&p.indexOf('inventory_edit')>=0)return true;
    if(n==='orders_view'&&p.indexOf('orders_edit')>=0)return true;
    return false;
  }
  function first(p){for(var i=0;i<ORDER.length;i++)if(ok(p,ORDER[i]))return LANDING[ORDER[i]];return null}
  function pageName(h){return String(h||'').split('?')[0].split('#')[0].split('/').pop().toLowerCase().replace(/\.html$/,'')}
  function navItem(el){return el.closest('li,.nav-item,.sidebar-item,.menu-item,.admin-nav-item,.drawer-item')||el}
  function hide(el){var x=navItem(el);x.style.setProperty('display','none','important');x.setAttribute('aria-hidden','true');x.setAttribute('tabindex','-1')}
  function filterNavigation(u){
    var p=perms(u);
    document.documentElement.dataset.pmtRole=String(u.role||'');
    document.querySelectorAll('a[href]').forEach(function(a){
      var need=PAGE[pageName(a.getAttribute('href'))];
      if(need&&!ok(p,need))hide(a);
    });
    document.querySelectorAll('[data-permission],[data-pmt-permission],[data-page-permission]').forEach(function(el){
      var n=el.getAttribute('data-permission')||el.getAttribute('data-pmt-permission')||el.getAttribute('data-page-permission');
      if(n&&!ok(p,n))hide(el);
    });
  }
  function ensureObserver(u){
    if(observer||!document.body)return;
    observer=new MutationObserver(function(records){
      if(scheduled)return;
      for(var i=0;i<records.length;i++)if(records[i].addedNodes&&records[i].addedNodes.length){
        scheduled=true;requestAnimationFrame(function(){scheduled=false;filterNavigation(u);});break;
      }
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }
  function apply(u){
    filterNavigation(u);ensureObserver(u);
    var p=perms(u),current=pageName(location.pathname)||'dashboard',need=PAGE[current];
    if(need&&!ok(p,need)){
      var target=first(p);if(target)location.replace('/admin/'+target);else deny();
      return false;
    }
    resolved=true;reveal();return true;
  }
  async function boot(){
    if(resolved)return;
    var token=sessionStorage.getItem('pmt-admin-token');if(!token){deny();return}
    var u=user();
    try{if(typeof window.pmtGet==='function'){var d=await window.pmtGet('myPermissions');if(d&&d.user)u=d.user}}catch(e){}
    if(!u){sessionStorage.removeItem('pmt-admin-token');sessionStorage.removeItem('pmt-admin-user');deny();return}
    u.permissions=perms(u);sessionStorage.setItem('pmt-admin-user',JSON.stringify(u));window.PMT_ADMIN_USER=u;apply(u);
  }
  window.PMT_ACCESS_V4={refresh:function(){resolved=false;return boot()},has:function(n){var u=user();return !!u&&ok(perms(u),n)},landing:function(){var u=user();return u&&first(perms(u))}};
  function start(){try{boot()}catch(e){deny()}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
