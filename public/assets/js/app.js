/* PMT frontend bootstrap. No secrets belong here. */
(function(){
  const root=document.documentElement;
  const saved=localStorage.getItem("pmt-theme");
  const prefersDark=window.matchMedia&&matchMedia("(prefers-color-scheme:dark)").matches;
  function applyTheme(mode){
    const dark=mode==="dark";
    root.setAttribute("data-theme",dark?"dark":"light");
    root.style.colorScheme=dark?"dark":"light";
    document.querySelectorAll(".theme-toggle").forEach(b=>{
      b.textContent=dark?"☀️":"🌙";
      b.setAttribute("aria-pressed",String(dark));
      b.title=dark?"Switch to light mode":"Switch to dark mode";
    });
  }
  applyTheme(saved|| (prefersDark?"dark":"light"));
  function bindThemeButtons(){
    document.querySelectorAll(".theme-toggle").forEach(b=>{
      if(b.dataset.themeBound)return;
      b.dataset.themeBound="1";
      b.onclick=()=>{
        const next=root.getAttribute("data-theme")==="dark"?"light":"dark";
        localStorage.setItem("pmt-theme",next);
        applyTheme(next);
      };
    });
  }
  bindThemeButtons();
  new MutationObserver(bindThemeButtons).observe(document.documentElement,{childList:true,subtree:true});
  const style=document.createElement("style");
  style.textContent=`
    [data-theme="dark"] body{background:var(--cream);color:var(--text)}
    [data-theme="dark"] .card-img{background:linear-gradient(135deg,#20243a,#28251d)}
    [data-theme="dark"] .form-card,[data-theme="dark"] .upload-box{border-color:var(--line)}
    [data-theme="dark"] input,[data-theme="dark"] select,[data-theme="dark"] textarea{color-scheme:dark}
    [data-theme="dark"] .panel,[data-theme="dark"] .card,[data-theme="dark"] .cms-section,[data-theme="dark"] .stat,[data-theme="dark"] .kpi{box-shadow:0 10px 28px rgba(0,0,0,.18)}
    .brand .mark img{display:block;width:100%;height:100%;object-fit:cover}
  `;
  document.head.appendChild(style);
  window.escapeHtml=function(s){const d=document.createElement("div");d.textContent=String(s??"");return d.innerHTML;};
  window.PMT_API_URL=localStorage.getItem("pmt-api-url")||window.PMT_PUBLIC_API_URL||"";
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
  if(!r.ok||d.ok===false){if(d.message==="Unauthorized"&&location.pathname.includes("/admin/")){sessionStorage.removeItem("pmt-admin-token");location.replace("login.html");}throw Error(d.message||"API request failed");}return d;
}
function pmtDeepMerge(a,b){if(!b)return a;for(const k of Object.keys(b)){if(b[k]&&typeof b[k]==="object"&&!Array.isArray(b[k])&&a[k])pmtDeepMerge(a[k],b[k]);else a[k]=b[k];}return a;}
async function loadSiteContent(){
  const local=JSON.parse(localStorage.getItem("pmt-content")||"null");
  let data=local?pmtDeepMerge(structuredClone(PMT_DEFAULT_CONTENT),local):structuredClone(PMT_DEFAULT_CONTENT);
  try{const remote=await pmtGet("content");if(remote?.content)data=pmtDeepMerge(data,remote.content);}catch(_){ }
  return data;
}
