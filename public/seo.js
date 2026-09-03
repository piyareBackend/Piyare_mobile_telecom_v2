// Piyare Mobile Telecom — SEO bootstrap
(function(){
  const origin=location.origin;
  function upsert(sel,tag,attrs){let el=document.querySelector(sel);if(!el){el=document.createElement(tag);document.head.appendChild(el)}Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));return el}
  const title=document.title||'Piyare Mobile Telecom';
  const desc=document.querySelector('meta[name="description"]')?.content||'Piyare Mobile Telecom — mobile repair, accessories and local service.';
  upsert('meta[name="description"]','meta',{name:'description',content:desc});
  upsert('meta[property="og:title"]','meta',{property:'og:title',content:title});
  upsert('meta[property="og:description"]','meta',{property:'og:description',content:desc});
  upsert('meta[property="og:type"]','meta',{property:'og:type',content:'website'});
  upsert('meta[property="og:url"]','meta',{property:'og:url',content:location.href.split('#')[0]});
  upsert('link[rel="canonical"]','link',{rel:'canonical',href:location.href.split('#')[0]});
  function addSchema(s){
    const schema={"@context":"https://schema.org","@type":"LocalBusiness","name":s.name||'Piyare Mobile Telecom',"url":origin,"description":s.tagline||desc,"priceRange":"₹₹","sameAs":s.justdialUrl?[s.justdialUrl]:[]};
    if(s.whatsapp){const p=String(s.whatsapp).replace(/\D/g,'');if(p)schema.telephone='+91-'+p}
    const old=document.querySelector('script[data-pmt-localbusiness]');if(old)old.remove();
    const tag=document.createElement('script');tag.type='application/ld+json';tag.dataset.pmtLocalbusiness='1';tag.textContent=JSON.stringify(schema);document.head.appendChild(tag);
  }
  function load(){if(typeof loadSiteContent!=='function')return setTimeout(load,100);loadSiteContent().then(data=>addSchema(data?.site||{})).catch(()=>addSchema({}));}
  load();
})();
