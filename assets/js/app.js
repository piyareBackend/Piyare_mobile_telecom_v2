/* PMT frontend bootstrap. No secrets belong here. */
(function(){
  const saved=localStorage.getItem("pmt-theme");
  const dark=saved==="dark" || (!saved && matchMedia("(prefers-color-scheme:dark)").matches);
  document.documentElement.toggleAttribute("data-theme",dark);
  const b=document.getElementById("themeToggle");
  if(b){b.textContent=dark?"☀️":"🌙";b.onclick=()=>{const d=document.documentElement.hasAttribute("data-theme");document.documentElement.toggleAttribute("data-theme",!d);localStorage.setItem("pmt-theme",d?"light":"dark");b.textContent=d?"🌙":"☀️";};}
  window.escapeHtml=function(s){const d=document.createElement("div");d.textContent=String(s??"");return d.innerHTML;};
  window.PMT_API_URL=localStorage.getItem("pmt-api-url")||window.PMT_PUBLIC_API_URL||"";

  // Replace the legacy phone emoji in the actual shared DOM, not just as a visual fallback.
  function logoUrl(){return new URL("assets/logo.png",document.baseURI).href;}
  function logoImage(size){
    const img=document.createElement("img");
    img.src=logoUrl();
    img.alt="Piyare Mobile Telecom logo";
    img.width=size; img.height=size;
    img.decoding="async";
    img.style.cssText=`width:${size}px;height:${size}px;object-fit:contain;display:block;`;
    return img;
  }
  function replaceLegacyLogo(){
    document.querySelectorAll("header .brand .mark").forEach(mark=>{
      mark.textContent="";
      mark.appendChild(logoImage(36));
    });
    document.querySelectorAll("footer .foot-brand").forEach(brand=>{
      const label="Piyare Mobile Telecom";
      brand.textContent="";
      const img=logoImage(28);
      img.style.cssText="width:28px;height:28px;object-fit:contain;display:inline-block;vertical-align:middle;margin-right:8px;border-radius:6px;";
      brand.appendChild(img);
      brand.appendChild(document.createTextNode(label));
    });
    document.querySelectorAll(".brand .mark, .foot-brand").forEach(el=>{
      const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
      const remove=[];
      while(walker.nextNode()) if(walker.currentNode.nodeValue.includes("📱")) remove.push(walker.currentNode);
      remove.forEach(n=>n.nodeValue=n.nodeValue.replaceAll("📱",""));
    });
    let favicon=document.querySelector('link[rel="icon"]');
    if(!favicon){favicon=document.createElement("link");favicon.rel="icon";document.head.appendChild(favicon);}
    favicon.href=logoUrl();
    favicon.type="image/png";
  }
  // Run as soon as the shared script is loaded; run again after parsing for pages whose footer/header is later inserted.
  replaceLegacyLogo();
  document.addEventListener("DOMContentLoaded",replaceLegacyLogo,{once:false});
  window.addEventListener("load",replaceLegacyLogo,{once:true});
})();

async function pmtGet(action,params={}){
  const api=localStorage.getItem("pmt-api-url")||window.PMT_PUBLIC_API_URL||""; if(!api)return null;
  const u=new URL(api);u.searchParams.set("action",action);
  const token=sessionStorage.getItem("pmt-admin-token")||"";if(token)u.searchParams.set("token",token);
  Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));
  const r=await fetch(u,{credentials:"omit"}); const d=await r.json().catch(()=>({ok:false,message:"Invalid API response"}));
  if(d.ok===false && d.message==="Unauthorized"){sessionStorage.removeItem("pmt-admin-token");if(location.pathname.includes("/admin/")&&!location.pathname.endsWith("login.html"))location.replace("login.html");}
  if(!r.ok)throw Error("API request failed"); return d;
}
async function pmtPost(payload){
  const api=localStorage.getItem("pmt-api-url")||window.PMT_PUBLIC_API_URL||"";if(!api)throw Error("Apps Script API URL is not configured.");
  const token=sessionStorage.getItem("pmt-admin-token")||"";
  const r=await fetch(api,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({...payload,token})});
  const d=await r.json().catch(()=>({ok:false,message:"Invalid API response"}));
  if(!r.ok||d.ok===false){if(d.message==="Unauthorized"){sessionStorage.removeItem("pmt-admin-token");location.replace("login.html");}throw Error(d.message||"API request failed");}return d;
}
function pmtDeepMerge(a,b){if(!b)return a;for(const k of Object.keys(b)){if(b[k]&&typeof b[k]==="object"&&!Array.isArray(b[k])&&a[k])pmtDeepMerge(a[k],b[k]);else a[k]=b[k];}return a;}
async function loadSiteContent(){
  const local=JSON.parse(localStorage.getItem("pmt-content")||"null");
  let data=local?pmtDeepMerge(structuredClone(PMT_DEFAULT_CONTENT),local):structuredClone(PMT_DEFAULT_CONTENT);
  try{const remote=await pmtGet("content");if(remote?.content)data=pmtDeepMerge(data,remote.content);}catch(_){ }
  return data;
}
