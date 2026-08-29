/* PMT CMS client — shared content defaults and lightweight SEO schema. */
const PMT_DEFAULT_CONTENT={site:{name:"Piyare Mobile Telecom",tagline:"Mobile phone dealer, accessories and repair services in Dwashay, Katihar.",whatsapp:"",address:"Basamtpur, Dwashay, Katihar, Bihar 855114, India",hours:"09:00 AM – 07:30 PM, Mon–Sun",city:"Katihar",state:"Bihar",postalCode:"855114",country:"IN",categories:["Mobile Phone Dealers","Mobile Phone Cover Dealers","Ear Phone Dealers","Mobile Phone Charger Dealers","Mobile Repair"],justdialUrl:"https://www.justdial.com/Katihar/Piyare-Mobile-Telecom-Dwashay/9999P6452-6452-250401125010-W1X1_BZDET"},home:{eyebrow:"Same-day repair · Local shop",title:"Phone toota? <span>Ticket katao,</span> theek karwao.",description:"Screen, battery, charging port — sab kuch fix hota hai yahin, aapke saamne. Saath mein original accessories bhi milte hain.",primaryText:"🔧 Book a Repair",primaryLink:"repair.html",secondaryText:"🛍️ Shop Accessories",secondaryLink:"shop.html"},trust:[{icon:"⚡",title:"Same-Day Fix",text:"Most repairs in under 1 hr"},{icon:"🛡️",title:"6-Month Warranty",text:"On every repair job"},{icon:"💯",title:"Genuine Parts",text:"No duplicate ya local parts"},{icon:"💬",title:"WhatsApp Support",text:"Order & booking updates"}],banners:[{id:"b1",title:"Big Repair Week",subtitle:"Screen & battery service starting at ₹299",button:"Book Repair",link:"repair.html",image:"",active:true},{id:"b2",title:"Accessories Sale",subtitle:"Selected accessories up to 30% off",button:"Shop Now",link:"shop.html",image:"",active:true}],gallery:[],footer:{description:"Aapke mohalle ki bharosemand mobile repair shop aur accessories store. Fast, fair aur guaranteed."}};

/* API and content caching live in app.js. Do not redefine them here. */
function initLocalBusinessSchema(){
  if(document.querySelector('meta[name="robots"][content*="noindex"]'))return;
  loadSiteContent().then(data=>{
    const s=data.site||{};
    const schema={"@context":"https://schema.org","@type":"LocalBusiness","name":s.name||"Piyare Mobile Telecom","description":s.tagline||"Mobile phone dealer, accessories and repair services in Katihar.","url":location.origin+location.pathname,"image":location.origin+"/assets/logo.svg","address":{"@type":"PostalAddress","streetAddress":s.address||"","addressLocality":s.city||"Katihar","addressRegion":s.state||"Bihar","postalCode":s.postalCode||"855114","addressCountry":s.country||"IN"},"openingHours":"Mo-Su 09:00-19:30","sameAs":s.justdialUrl?[s.justdialUrl]:[],"areaServed":"Katihar"};
    if(s.whatsapp)schema.telephone=s.whatsapp;
    if(Array.isArray(s.categories)&&s.categories.length)schema.knowsAbout=s.categories;
    const tag=document.createElement("script");tag.type="application/ld+json";tag.textContent=JSON.stringify(schema);document.head.appendChild(tag);
  }).catch(()=>{});
}
document.addEventListener("DOMContentLoaded",initLocalBusinessSchema);
