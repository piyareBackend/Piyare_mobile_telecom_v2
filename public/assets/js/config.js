/* PMT public configuration. Navigation is initialized only by app.js to avoid duplicate mobile-menu handlers. */
window.PMT_PUBLIC_API_URL="/api";
window.PMT_OWNER_WHATSAPP="";

(function(){
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
  function init(){contact()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  window.addEventListener('pmt-content-updated',contact);
  window.PMT_SYNC_CONTACT_NUMBER=syncPhone;
})();
