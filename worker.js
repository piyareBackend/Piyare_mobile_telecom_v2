const PMT_API='https://script.google.com/macros/s/AKfycbwstzcqUNbrxIV-4cxgmi_s7Yp-JYGO4ozHwwascfG4c3dr5mAsxQatD_6fpfxruu4/exec';

function canonicalDriveSource(value){
  const s=String(value||'').trim();if(!s)return '';
  try{
    const u=new URL(s);
    const isDrive=['drive.google.com','drive.usercontent.google.com','lh3.googleusercontent.com'].includes(u.hostname);
    if(isDrive){
      let id='';
      const file=u.pathname.match(/\/file\/d\/([^/]+)/);if(file)id=file[1];
      if(!id&&u.pathname.match(/\/d\/([^/]+)/))id=u.pathname.match(/\/d\/([^/]+)/)[1];
      if(!id)id=u.searchParams.get('id')||'';
      if(id)return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600`;
    }
    return s;
  }catch(_){return s;}
}

export default {
  async fetch(request, env) {
    const url=new URL(request.url);

    // Allow the companion admin app (hosted on a different domain) to call this API.
    const ALLOWED_ORIGINS = [
      'https://pmt-admin-app.netlify.app'
      // add more origins here if you host the admin app elsewhere too
    ];
    const origin = request.headers.get('Origin') || '';
    const corsHeaders = {};
    if (ALLOWED_ORIGINS.includes(origin)) {
      corsHeaders['Access-Control-Allow-Origin'] = origin;
      corsHeaders['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS';
      corsHeaders['Access-Control-Allow-Headers'] = 'Content-Type';
    }

    if (request.method === 'OPTIONS' && (url.pathname==='/api' || url.pathname.startsWith('/api/'))) {
      return new Response(null, {status:204, headers:corsHeaders});
    }

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
        const response=await fetch(target.toString(),cacheablePublic?{...init,cf:{cacheTtl:120,cacheEverything:true}}:{...init,cache:'no-store'});
        const out=new Response(response.body,response);
        out.headers.set('Cache-Control',cacheablePublic?'public, max-age=120, s-maxage=120':'no-store, no-cache, must-revalidate');
        out.headers.set('X-PMT-API-Proxy','ok');
        Object.entries(corsHeaders).forEach(([k,v])=>out.headers.set(k,v));
        return out;
      }catch(err){
        return new Response(JSON.stringify({ok:false,error:String(err&&err.message||err),code:'API_PROXY_FAILED'}),{status:502,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...corsHeaders}});
      }
    }
    if(url.pathname==='/img'){
      const source=url.searchParams.get('src');if(!source)return new Response(JSON.stringify({ok:false,error:'Missing image source',code:'IMAGE_SOURCE_MISSING'}),{status:400,headers:{'Content-Type':'application/json'}});
      let src;try{src=new URL(canonicalDriveSource(source));}catch(_){return new Response(JSON.stringify({ok:false,error:'Invalid image source',code:'IMAGE_SOURCE_INVALID'}),{status:400,headers:{'Content-Type':'application/json'}});}
      if(!['drive.google.com','drive.usercontent.google.com','lh3.googleusercontent.com'].includes(src.hostname))return new Response(JSON.stringify({ok:false,error:'Image source not allowed',code:'IMAGE_SOURCE_NOT_ALLOWED'}),{status:403,headers:{'Content-Type':'application/json'}});
      const width=Math.max(120,Math.min(1600,Number(url.searchParams.get('w')||1200)));const height=Math.max(80,Math.min(1200,Number(url.searchParams.get('h')||900)));
      const response=await fetch(src.toString(),{cf:{image:{width,height,fit:'scale-down',format:'auto',quality:82}},redirect:'follow'});
      if(!response.ok)return new Response(JSON.stringify({ok:false,error:'Drive image unavailable',code:'IMAGE_FETCH_FAILED'}),{status:response.status||502,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
      const out=new Response(response.body,response);out.headers.set('Cache-Control','public, max-age=86400, immutable');return out;
    }
    return env.ASSETS.fetch(request);
  },
};
