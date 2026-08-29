const PMT_API='https://script.google.com/macros/s/AKfycbwstzcqUNbrxIV-4cxgmi_s7Yp-JYGO4ozHwwascfG4c3dr5mAsxQatD_6fpfxru4u/exec';

export default {
  async fetch(request, env) {
    const url=new URL(request.url);
    if(url.pathname==='/api' || url.pathname.startsWith('/api/')){
      const target=new URL(PMT_API);
      url.searchParams.forEach((v,k)=>target.searchParams.set(k,v));
      const isPublic=request.method==='GET' && ['content','publicProducts','publicCoupons','track'].includes(url.searchParams.get('action')||'');
      const init={method:request.method,headers:new Headers(request.headers),body:request.method==='GET'||request.method==='HEAD'?undefined:request.body,redirect:'follow'};
      if(request.method==='GET' && isPublic){
        const response=await fetch(target.toString(),{...init,cf:{cacheTtl:30,cacheEverything:true}});
        return new Response(response.body,response);
      }
      const response=await fetch(target.toString(),init);
      const out=new Response(response.body,response);
      out.headers.set('Cache-Control','no-store');
      return out;
    }
    return env.ASSETS.fetch(request);
  },
};
