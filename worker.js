const PMT_API='https://script.google.com/macros/s/AKfycbwstzcqUNbrxIV-4cxgmi_s7Yp-JYGO4ozHwwascfG4c3dr5mAsxQatD_6fpfxruu4/exec';

export default {
  async fetch(request, env) {
    const url=new URL(request.url);
    if(url.pathname==='/api' || url.pathname.startsWith('/api/')){
      const target=new URL(PMT_API);url.searchParams.forEach((v,k)=>target.searchParams.set(k,v));
      const action=url.searchParams.get('action')||'';
      const isPublic=request.method==='GET' && ['content','publicProducts','publicCoupons','track'].includes(action);
      const cacheablePublic=request.method==='GET' && ['publicProducts','publicCoupons','track'].includes(action);
      const init={method:request.method,headers:new Headers(request.headers),body:request.method==='GET'||request.method==='HEAD'?undefined:request.body,redirect:'follow'};
      if(cacheablePublic){const response=await fetch(target.toString(),{...init,cf:{cacheTtl:30,cacheEverything:true}});return new Response(response.body,response);}
      if(isPublic){const response=await fetch(target.toString(),{...init,cache:'no-store'});const out=new Response(response.body,response);out.headers.set('Cache-Control','no-store, no-cache, must-revalidate');return out;}
      const response=await fetch(target.toString(),init);const out=new Response(response.body,response);out.headers.set('Cache-Control','no-store');return out;
    }
    if(url.pathname==='/img'){
      const source=url.searchParams.get('src');if(!source)return new Response('Missing image source',{status:400});
      let src;try{src=new URL(source);}catch(e){return new Response('Invalid image source',{status:400});}
      if(!['drive.google.com','lh3.googleusercontent.com'].includes(src.hostname))return new Response('Image source not allowed',{status:403});
      const width=Math.max(120,Math.min(1600,Number(url.searchParams.get('w')||900)));const height=Math.max(80,Math.min(1200,Number(url.searchParams.get('h')||900)));
      const response=await fetch(src.toString(),{cf:{image:{width,height,fit:'scale-down',format:'auto',quality:78}}});
      if(!response.ok)return fetch(src.toString());
      const out=new Response(response.body,response);out.headers.set('Cache-Control','public, max-age=86400, immutable');return out;
    }
    return env.ASSETS.fetch(request);
  },
};
