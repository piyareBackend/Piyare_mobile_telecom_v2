/* PMT public configuration. Cloudflare Worker is the only browser API surface. */
(function(){
  var WORKER_API='https://piyare-mobile-telecom.sadab-notes-backup.workers.dev/api';
  var host=String(location.hostname||'').toLowerCase();
  var isNetlify=/\.netlify\.app$/.test(host);
  window.PMT_PUBLIC_API_URL=isNetlify?WORKER_API:'/api';
  window.PMT_OWNER_WHATSAPP='';

  function registerPWA(){
    if(!('serviceWorker' in navigator))return;
    navigator.serviceWorker.register('/admin/sw.js',{scope:'/admin/'}).catch(function(){});
  }

  function installRealtimeAdminGet(){
    if(!/\/admin\//.test(location.pathname)||window.__PMT_REALTIME_GET)return;
    if(typeof window.pmtGet!=='function')return setTimeout(installRealtimeAdminGet,50);
    var original=window.pmtGet;
    window.pmtGet=async function(action,params){
      var adminActions=['dashboard','analytics','homepage','products','orders','repairs','coupons','reviews','notifications','lowStock','users','feedback','activity','customers','inventory','monthlyReport','orderDetail','customerDetail'];
      if(adminActions.indexOf(action)>=0){params=Object.assign({},params||{}, {_fresh:String(Date.now())});}
      return original(action,params);
    };
    window.__PMT_REALTIME_GET=true;
  }

  function installOffline(){
    if(!/\/admin\//.test(location.pathname)||window.__PMT_OFFLINE_LOADER||window.PMT_OFFLINE)return;
    window.__PMT_OFFLINE_LOADER=true;
    var s=document.createElement('script');s.src='/assets/js/offline-core.js?v=2';s.async=false;
    s.onload=function(){};s.onerror=function(){window.__PMT_OFFLINE_LOADER=false};
    document.head.appendChild(s);
  }

  function syncPhone(data){
    var s=data&&data.site||{};
    var phone=String(s.whatsapp||window.PMT_OWNER_WHATSAPP||'').replace(/\D/g,'');
    if(phone)window.PMT_OWNER_WHATSAPP=phone;
    if(!phone)return;
    document.querySelectorAll('a[href^="tel:"]').forEach(function(a){a.textContent='Call Shop';a.setAttribute('aria-label','Call Shop');a.href='tel:+'+phone;a.removeAttribute('aria-disabled');a.style.pointerEvents='';a.style.opacity=''});
    document.querySelectorAll('a[href*="wa.me/"]').forEach(function(a){a.href=a.href.replace(/(wa\.me\/)[^?/#]+/i,'$1'+phone);var t=a.textContent||'';if(/WhatsApp/i.test(t))a.textContent='WhatsApp';else if(/[6-9][0-9]{9}/.test(t))a.textContent=t.replace(/[6-9][0-9]{9}/g,phone)});
    document.querySelectorAll('body *').forEach(function(el){if(el.children.length===0&&/Hours:\s*10 AM|10 AM – 8:30 PM/.test(el.textContent||''))el.textContent='Hours: '+String(s.hours||'10 AM – 8:30 PM')});
  }
  function contact(){
    if(typeof loadSiteContent!=='function')return setTimeout(contact,100);
    loadSiteContent().then(syncPhone).catch(function(){});
  }
  function init(){registerPWA();contact();installRealtimeAdminGet();setTimeout(installOffline,0)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  window.addEventListener('pmt-content-updated',contact);
  window.PMT_SYNC_CONTACT_NUMBER=syncPhone;
})();
