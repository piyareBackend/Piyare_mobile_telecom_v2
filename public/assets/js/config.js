/* Public configuration. The Cloudflare Worker exposes the Apps Script API at /api. */
window.PMT_PUBLIC_API_URL="/api";
window.PMT_OWNER_WHATSAPP="917366815917";

/* Small global UX layer: mobile navigation + CMS-driven contact hours. */
(function(){
  function nav(){
    document.querySelectorAll('header .nav').forEach(function(n){
      var links=n.querySelector('.navlinks'); if(!links)return;
      var b=n.querySelector('.site-mobile-menu');
      if(!b){b=document.createElement('button');b.className='site-mobile-menu';b.type='button';b.setAttribute('aria-label','Open navigation');b.setAttribute('aria-expanded','false');b.innerHTML='<span></span><span></span><span></span>';n.insertBefore(b,n.firstChild)}
      var o=document.querySelector('.site-menu-overlay[data-pmt-global]');
      if(!o){o=document.createElement('div');o.className='site-menu-overlay';o.dataset.pmtGlobal='1';document.body.appendChild(o)}
      if(b.dataset.globalBound)return;b.dataset.globalBound='1';
      function close(){links.classList.remove('mobile-open');o.classList.remove('open');b.setAttribute('aria-expanded','false');document.body.classList.remove('site-menu-open')}
      function toggle(e){if(e){e.preventDefault();e.stopPropagation()}var open=!links.classList.contains('mobile-open');links.classList.toggle('mobile-open',open);o.classList.toggle('open',open);b.setAttribute('aria-expanded',String(open));document.body.classList.toggle('site-menu-open',open)}
      b.addEventListener('click',toggle);b.addEventListener('touchend',toggle,{passive:false});o.addEventListener('click',close);links.querySelectorAll('a').forEach(function(a){a.addEventListener('click',close)})
    });
  }
  function installNavCss(){if(document.getElementById('pmt-global-nav-css'))return;var s=document.createElement('style');s.id='pmt-global-nav-css';s.textContent='.site-mobile-menu{display:none!important}@media(max-width:800px){.site-mobile-menu{display:flex!important;width:40px;height:40px;flex:0 0 40px;align-items:center;justify-content:center;flex-direction:column;gap:4px;border:0;border-radius:10px;background:rgba(255,255,255,.1);color:inherit;z-index:130;cursor:pointer}.site-mobile-menu span{display:block;width:21px;height:2px;background:currentColor;border-radius:2px}.site-menu-overlay{display:none!important;position:fixed;inset:0;z-index:110;background:rgba(0,0,0,.35)}.site-menu-overlay.open{display:block!important}header .navlinks.mobile-open{display:flex!important;position:fixed!important;left:12px!important;right:12px!important;top:68px!important;z-index:125!important;flex-direction:column!important;padding:10px!important;background:var(--surface)!important;border:1px solid var(--line)!important;border-radius:14px!important;box-shadow:0 18px 45px rgba(0,0,0,.28)!important}header .navlinks.mobile-open a{display:block!important;padding:13px!important;color:var(--text)!important}body.site-menu-open{overflow:hidden!important}}';document.head.appendChild(s)}
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
  function init(){installNavCss();nav();contact()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();window.addEventListener('pmt-content-updated',contact);
})();
