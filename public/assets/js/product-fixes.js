/* PMT product-system hardening. Loaded after app.js and before page-specific product scripts. */
(function(){
  const CACHE_KEY='pmt-public-products-cache-v3';
  const CACHE_TTL=5*60*1000;
  const DRIVE_HOSTS=['drive.google.com','drive.usercontent.google.com','lh3.googleusercontent.com'];
  function driveId(value){
    const s=String(value||'').trim(); if(!s)return '';
    try{
      const u=new URL(s,location.origin);
      if(u.hostname==='drive.google.com'){
        const m=u.pathname.match(/\/file\/d\/([^/]+)/); if(m)return m[1];
        const q=u.searchParams.get('id'); if(q)return q;
        const m2=u.pathname.match(/\/uc\/?$/); if(m2&&u.searchParams.get('id'))return u.searchParams.get('id');
      }
      if(u.hostname==='drive.usercontent.google.com'||u.hostname==='lh3.googleusercontent.com')return u.searchParams.get('id')||'';
    }catch(_){}
    const m=s.match(/(?:file\/d\/|[?&]id=)([A-Za-z0-9_-]{10,})/); return m?m[1]:'';
  }
  function mediaUrl(value){
    const s=String(value||'').trim(); if(!s)return '';
    if(s.startsWith('blob:')||s.startsWith('data:'))return s;
    try{
      const u=new URL(s,location.origin);
      if(u.pathname==='/img')return u.toString();
      if(DRIVE_HOSTS.includes(u.hostname)){
        const id=driveId(s);
        const canonical=id?'https://drive.google.com/uc?export=view&id='+encodeURIComponent(id):s;
        return location.origin+'/img?src='+encodeURIComponent(canonical);
      }
      return u.toString();
    }catch(_){
      const id=driveId(s);
      return id?location.origin+'/img?src='+encodeURIComponent('https://drive.google.com/uc?export=view&id='+id):s;
    }
  }
  window.pmtMediaUrl=mediaUrl;
  function normalize(d){
    const raw=Array.isArray(d)?d:(Array.isArray(d?.items)?d.items:Array.isArray(d?.products)?d.products:Array.isArray(d?.data)?d.data:[]);
    return raw.filter(Boolean).map((x,i)=>({...x,
      id:String(x.id??x.ID??x.productId??('product-'+i)),name:String(x.name??x.title??''),
      category:String(x.category??'Accessories'),price:Number(x.price??0),stock:Number(x.stock??0),
      description:String(x.description??''),images:Array.isArray(x.images)?x.images.filter(Boolean):x.image?[x.image]:[],
      variants:Array.isArray(x.variants)?x.variants:[],mainImage:Math.max(0,Number(x.mainImage)||0),
      imageSettings:x.imageSettings&&typeof x.imageSettings==='object'?x.imageSettings:{}
    })).filter(x=>x.name);
  }
  window.pmtGetPublicProducts=async function(){
    try{
      const u=new URL(window.PMT_PUBLIC_API_URL||'/api',location.origin);u.searchParams.set('action','publicProducts');
      const r=await fetch(u.toString(),{headers:{Accept:'application/json'},cache:'no-store'});
      const text=await r.text();let d;try{d=JSON.parse(text)}catch(_){throw Error('API returned non-JSON data')}
      if(!r.ok||d.ok===false)throw Error(d.message||('API request failed ('+r.status+')'));
      const items=normalize(d);localStorage.setItem(CACHE_KEY,JSON.stringify({ts:Date.now(),items}));return items;
    }catch(err){
      try{const c=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');if(c&&Array.isArray(c.items)&&Date.now()-Number(c.ts||0)<=CACHE_TTL)return c.items;}catch(_){}
      throw err;
    }
  };
  window.PMTProductSEO=function(x,images){
    const base=location.origin+location.pathname+'?id='+encodeURIComponent(x.id);
    const set=(selector,attr,value)=>{let el=document.querySelector(selector);if(!el){el=document.createElement('meta');document.head.appendChild(el);if(selector.includes('name='))el.name=selector.match(/name="([^"]+)/)?.[1]||'';else el.setAttribute('property',selector.match(/property="([^"]+)/)?.[1]||'')}el.setAttribute(attr,value||'')};
    document.title=(x.seoTitle||x.name)+' — Piyare Mobile Telecom';
    const desc=String(x.seoDescription||x.description||('Buy '+x.name+' from Piyare Mobile Telecom.')).slice(0,300);
    set('meta[name="description"]','content',desc);set('meta[property="og:title"]','content',x.seoTitle||x.name);set('meta[property="og:description"]','content',desc);set('meta[property="og:type"]','content','product');set('meta[property="og:url"]','content',base);set('meta[property="og:image"]','content',images?.length?mediaUrl(images[Math.max(0,Math.min(Number(x.mainImage)||0,images.length-1))]):'');set('meta[name="twitter:card"]','content','summary_large_image');set('meta[name="twitter:title"]','content',x.seoTitle||x.name);set('meta[name="twitter:description"]','content',desc);
    let canonical=document.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical)}canonical.href=base;
    const old=document.getElementById('pmt-product-jsonld');if(old)old.remove();const ld=document.createElement('script');ld.id='pmt-product-jsonld';ld.type='application/ld+json';ld.textContent=JSON.stringify({'@context':'https://schema.org','@type':'Product',name:x.name,description:String(x.description||''),image:(images||[]).map(mediaUrl),sku:String(x.sku||x.id),brand:{'@type':'Brand',name:String(x.brand||'Piyare Mobile Telecom')},offers:{'@type':'Offer',price:Number(x.price||0).toFixed(2),priceCurrency:'INR',availability:Number(x.stock||0)>0?'https://schema.org/InStock':'https://schema.org/OutOfStock',url:base}});document.head.appendChild(ld);
  };
})();
