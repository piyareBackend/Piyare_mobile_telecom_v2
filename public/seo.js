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
  if(location.pathname==='/'||/index\.html$/.test(location.pathname)){
    const s=document.createElement('script');s.type='application/ld+json';s.textContent=JSON.stringify({"@context":"https://schema.org","@type":"LocalBusiness","name":"Piyare Mobile Telecom","url":origin,"description":desc,"telephone":"+91-7481997721","priceRange":"₹₹","sameAs":[]});document.head.appendChild(s);
  }
})();