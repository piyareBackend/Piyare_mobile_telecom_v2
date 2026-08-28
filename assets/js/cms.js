/*
 PMT CMS client
 All public editable content is fetched from the API when configured.
 A local fallback keeps the demo usable before backend setup.
*/
const PMT_DEFAULT_CONTENT = {
  site:{
    name:"Piyare Mobile Telecom",
    tagline:"Mobile phone dealer, accessories and repair services in Dwashay, Katihar.",
    whatsapp:"",
    address:"Basamtpur, Dwashay, Katihar, Bihar 855114, India",
    hours:"09:00 AM – 07:30 PM, Mon–Sun",
    city:"Katihar",
    state:"Bihar",
    postalCode:"855114",
    country:"IN",
    categories:["Mobile Phone Dealers","Mobile Phone Cover Dealers","Ear Phone Dealers","Mobile Phone Charger Dealers","Mobile Repair"],
    justdialUrl:"https://www.justdial.com/Katihar/Piyare-Mobile-Telecom-Dwashay/9999P6452-6452-250401125010-W1X1_BZDET"
  },
  home:{eyebrow:"Same-day repair · Local shop",title:"Phone toota? <span>Ticket katao,</span> theek karwao.",description:"Screen, battery, charging port — sab kuch fix hota hai yahin, aapke saamne. Saath mein original accessories bhi milte hain.",primaryText:"🔧 Book a Repair",primaryLink:"repair.html",secondaryText:"🛍️ Shop Accessories",secondaryLink:"shop.html"},
  trust:[
    {icon:"⚡",title:"Same-Day Fix",text:"Most repairs in under 1 hr"},
    {icon:"🛡️",title:"6-Month Warranty",text:"On every repair job"},
    {icon:"💯",title:"Genuine Parts",text:"No duplicate ya local parts"},
    {icon:"💬",title:"WhatsApp Support",text:"Order & booking updates"}
  ],
  banners:[
    {id:"b1",title:"Big Repair Week",subtitle:"Screen & battery service starting at ₹299",button:"Book Repair",link:"repair.html",image:"",active:true},
    {id:"b2",title:"Accessories Sale",subtitle:"Selected accessories up to 30% off",button:"Shop Now",link:"shop.html",image:"",active:true}
  ],
  footer:{description:"Aapke mohalle ki bharosemand mobile repair shop aur accessories store. Fast, fair aur guaranteed."}
};

async function pmtGet(action, params={}){
  const api=localStorage.getItem("pmt-api-url")||"";
  if(!api) return null;
  const u=new URL(api); u.searchParams.set("action",action);
  Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));
  const r=await fetch(u,{credentials:"omit"});
  if(!r.ok) throw Error("API request failed");
  return r.json();
}
async function pmtPost(payload){
  const api=localStorage.getItem("pmt-api-url")||"";
  if(!api) throw Error("Apps Script API URL is not configured.");
  const token=sessionStorage.getItem("pmt-admin-token")||"";
  const r=await fetch(api,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({...payload,token})});
  const d=await r.json().catch(()=>({ok:false,message:"Invalid API response"}));
  if(!r.ok || d.ok===false) throw Error(d.message||"API request failed");
  return d;
}
function pmtDeepMerge(a,b){
  if(!b) return a;
  for(const k of Object.keys(b)){
    if(b[k] && typeof b[k]==="object" && !Array.isArray(b[k]) && a[k]) pmtDeepMerge(a[k],b[k]);
    else a[k]=b[k];
  }
  return a;
}
async function loadSiteContent(){
  const local=JSON.parse(localStorage.getItem("pmt-content")||"null");
  let data=local?pmtDeepMerge(structuredClone(PMT_DEFAULT_CONTENT),local):structuredClone(PMT_DEFAULT_CONTENT);
  try{const remote=await pmtGet("content"); if(remote?.content) data=pmtDeepMerge(data,remote.content)}catch(_){}
  return data;
}

/* Dynamic LocalBusiness metadata uses the same editable profile as the CMS. */
async function initLocalBusinessSchema(){
  if(document.querySelector('meta[name="robots"][content*="noindex"]')) return;
  try{
    const data=await loadSiteContent(), s=data.site||{};
    const schema={
      "@context":"https://schema.org",
      "@type":"LocalBusiness",
      "name":s.name||"Piyare Mobile Telecom",
      "description":s.tagline||"Mobile phone dealer, accessories and repair services in Katihar.",
      "url":location.origin+location.pathname,
      "image":location.origin+"/assets/logo.svg",
      "address":{"@type":"PostalAddress","streetAddress":s.address||"","addressLocality":s.city||"Katihar","addressRegion":s.state||"Bihar","postalCode":s.postalCode||"855114","addressCountry":s.country||"IN"},
      "openingHours":"Mo-Su 09:00-19:30",
      "sameAs":s.justdialUrl?[s.justdialUrl]:[],
      "areaServed":"Katihar"
    };
    if(s.whatsapp) schema.telephone=s.whatsapp;
    if(Array.isArray(s.categories)&&s.categories.length) schema.knowsAbout=s.categories;
    const tag=document.createElement("script");tag.type="application/ld+json";tag.textContent=JSON.stringify(schema);document.head.appendChild(tag);
  }catch(_){}
}
document.addEventListener("DOMContentLoaded",initLocalBusinessSchema);
