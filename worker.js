const PMT_API='https://script.google.com/macros/s/AKfycbwstzcqUNbrxIV-4cxgmi_s7Yp-JYGO4ozHwwascfG4c3dr5mAsxQatD_6fpfxruu4/exec';

export default {
  async fetch(request, env) {
    const url=new URL(request.url);
    if(url.pathname==='/api' || url.pathname.startsWith('/api/')){
      const target=new URL(PMT_API);
      url.searchParams.forEach((v,k)=>target.searchParams.set(k,v));
      const action=url.searchParams.get('action')||'';
      const cacheablePublic=request.method==='GET' && ['publicProducts','publicCoupons','track'].includes(action);
      const headers=new Headers();
      const ct=request.headers.get('content-type');
      const accept=request.headers.get('accept');
      if(ct)headers.set('content-type',ct);
      if(accept)headers.set('accept',accept);
      let body;
      if(request.method!=='GET'&&request.method!=='HEAD')body=await request.arrayBuffer();
      const init={method:request.method,headers,body,redirect:'follow'};
      try{
        const response=await fetch(target.toString(),cacheablePublic?{...init,cf:{cacheTtl:5,cacheEverything:true}}:{...init,cache:'no-store'});
        const out=new Response(response.body,response);
        out.headers.set('Cache-Control',cacheablePublic?'public, max-age=5, s-maxage=5':'no-store, no-cache, must-revalidate');
        out.headers.set('X-PMT-API-Proxy','ok');
        return out;
      }catch(err){
        return new Response(JSON.stringify({ok:false,message:'API proxy failed',detail:String(err&&err.message||err)}),{status:502,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
      }
    }
    if(url.pathname==='/img'){
      const source=url.searchParams.get('src');if(!source)return new Response('Missing image source',{status:400});
      let src;try{src=new URL(source);}catch(e){return new Response('Invalid image source',{status:400});}
      if(!['drive.google.com','lh3.googleusercontent.com'].includes(src.hostname))return new Response('Image source not allowed',{status:403});
      const width=Math.max(120,Math.min(1600,Number(url.searchParams.get('w')||1200)));const height=Math.max(80,Math.min(1200,Number(url.searchParams.get('h')||900)));
      const response=await fetch(src.toString(),{cf:{image:{width,height,fit:'scale-down',format:'auto',quality:82}}});
      if(!response.ok)return fetch(src.toString(),{cache:'no-store'});
      const out=new Response(response.body,response);out.headers.set('Cache-Control','public, max-age=86400, immutable');return out;
    }
    return env.ASSETS.fetch(request);
  },
};
