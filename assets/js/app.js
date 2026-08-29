/* PMT frontend bootstrap. No secrets belong here. */
(function(){
  const saved=localStorage.getItem("pmt-theme");
  const dark=saved==="dark" || (!saved && matchMedia("(prefers-color-scheme:dark)").matches);
  document.documentElement.toggleAttribute("data-theme",dark);
  const b=document.getElementById("themeToggle");
  if(b){b.textContent=dark?"☀️":"🌙";b.onclick=()=>{const d=document.documentElement.hasAttribute("data-theme");document.documentElement.toggleAttribute("data-theme",!d);localStorage.setItem("pmt-theme",d?"light":"dark");b.textContent=d?"🌙":"☀️";};}
  window.escapeHtml=function(s){const d=document.createElement("div");d.textContent=String(s??"");return d.innerHTML;};
  window.PMT_API_URL=localStorage.getItem("pmt-api-url")||window.PMT_PUBLIC_API_URL||"";

  // Use the uploaded PMT logo everywhere the shared header/footer uses the old phone emoji.
  function applyLogo(){
    document.querySelectorAll("header .brand .mark").forEach(mark=>{
      if(mark.querySelector("img"))return;
      const img=document.createElement("img");
      img.src="assets/logo.png";
      img.alt="Piyare Mobile Telecom logo";
      img.decoding="async";
      img.loading="eager";
      mark.textContent="";
      mark.appendChild(img);
    });
    document.querySelectorAll("footer .foot-brand").forEach(brand=>{
      if(brand.querySelector("img"))return;
      const img=document.createElement("img");
      img.src="assets/logo.png";
      img.alt="Piyare Mobile Telecom logo";
      img.width=28;
      img.height=28;
      img.decoding="async";
      img.loading="eager";
      img.style.cssText="width:28px;height:28px;object-fit:contain;vertical-align:middle;margin-right:8px;border-radius:6px;";
      brand.prepend(img);
      brand.childNodes.forEach(node=>{if(node.nodeType===3)node.textContent=node.textContent.replace(/^\s*📱\s*/," ");});
    });
    let favicon=document.querySelector('link[rel="icon"]');
    if(!favicon){favicon=document.createElement("link");favicon.rel="icon";document.head.appendChild(favicon);}
    favicon.href="assets/logo.png";
    favicon.type="image/png";
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",applyLogo);else applyLogo();
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
