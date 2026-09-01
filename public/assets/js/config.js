/* PMT public configuration. Navigation is initialized only by app.js to avoid duplicate mobile-menu handlers. */
window.PMT_PUBLIC_API_URL="/api";
window.PMT_OWNER_WHATSAPP="917366815917";

(function(){
  function contact(){
    if(!/contact\.html?$/.test(location.pathname))return;
    var run=function(){
      if(typeof loadSiteContent!=='function')return setTimeout(run,50);
      loadSiteContent().then(function(data){var s=data&&data.site||{},hours=String(s.hours||'');var phone=String(s.whatsapp||window.PMT_OWNER_WHATSAPP||'').replace(/\D/g,'');var closed=false;
        var m=hours.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*[–-]\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
        if(m){function mins(h,mi,ap){h=Number(h);mi=Number(mi||0);if(ap&&ap.toUpperCase()==='PM'&&h<12)h+=12;if(ap&&ap.toUpperCase()==='AM'&&h===12)h=0;return h*60+mi}var now=new Date(),cur=now.getHours()*60+now.getMinutes(),from=mins(m[1],m[2],m[3]),to=mins(m[4],m[5],m[6]);closed=from<=to?(cur<from||cur>to):(cur<from&&cur>to)}
        document.querySelectorAll('a[href^="tel:"]').forEach(function(a){a.textContent=closed?'Call unavailable — shop closed':'Call Shop';a.setAttribute('aria-label',closed?'Call unavailable — shop closed':'Call Shop');if(phone&&!closed)a.href='tel:+'+phone;else{a.removeAttribute('href');a.setAttribute('aria-disabled','true');a.style.pointerEvents='none';a.style.opacity='.55'}});
        document.querySelectorAll('a[href*="wa.me/"]').forEach(function(a){if(phone)a.href='https://wa.me/'+phone;if(/7481997721|917481997721/.test(a.textContent||''))a.textContent='WhatsApp'});
        document.querySelectorAll('body *').forEach(function(el){if(el.children.length===0&&/Hours:\s*10 AM|10 AM – 8:30 PM/.test(el.textContent||''))el.textContent='Hours: '+hours});
      }).catch(function(){});
    };run();
  }
  function init(){contact()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();window.addEventListener('pmt-content-updated',contact);
})();
