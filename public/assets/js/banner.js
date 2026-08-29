async function initBanners(){
 try{
  const c=document.getElementById("bannerCarousel");if(!c)return;
  const data=await loadSiteContent(),items=(data.banners||[]).filter(x=>x.active!==false);
  if(!items.length)return;
  const hero=document.querySelector(".hero"),wrap=document.querySelector(".hero .wrap"),ticket=wrap?.querySelector(".ticket"),originalWrap=c.closest(".banner-wrap");
  const first=items[0];
  const esc=s=>String(s??"").replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const placement=first.placement||"card";
  const fit=first.fit||"cover",position=first.position||"center",blur=Math.max(0,Math.min(20,Number(first.blur)||0));
  const height=Math.max(180,Math.min(620,Number(first.height)||300));
  const radius=Math.max(0,Math.min(40,Number(first.radius)||16));
  const overlay=Math.max(0,Math.min(1,Number(first.overlay??.45)));
  const bg=first.backgroundColor||"#1B1F3B";
  const css=document.createElement("style");css.textContent=`
   .hero .wrap{position:relative}.hero-media-bg{position:absolute;inset:0;background-size:${fit};background-position:${position};background-repeat:no-repeat;filter:blur(${blur}px);transform:scale(${blur?1.03:1});pointer-events:none}.hero-media-overlay{position:absolute;inset:0;background:${bg};opacity:${overlay};pointer-events:none}.hero.has-hero-media{background:${bg};background-image:none}.hero.has-hero-media>.wrap{z-index:2}
   .hero-banner{position:relative;width:100%;height:${height}px;border-radius:${radius}px;overflow:hidden;box-shadow:0 30px 60px rgba(0,0,0,.28);background:${bg};color:#fff;transform:none!important;isolation:isolate}.hero-banner .banner-slide{position:absolute;inset:0;opacity:0;visibility:hidden;transition:opacity .4s ease;background:${bg};overflow:hidden}.hero-banner .banner-slide.show{opacity:1;visibility:visible}.hero-banner .banner-media{position:absolute;inset:0;width:100%;height:100%;object-fit:${fit};object-position:${position};filter:blur(${blur}px);transform:scale(${blur?1.03:1})}.hero-banner .banner-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(27,31,59,.92),rgba(27,31,59,.18));z-index:1}.hero-banner .banner-copy{position:absolute;left:28px;right:28px;bottom:28px;z-index:2;max-width:90%}.hero-banner .banner-copy h2{font-size:1.65rem;line-height:1.12;margin:5px 0 8px;color:#fff}.hero-banner .banner-copy p{font-size:.88rem;color:#eef0f8;margin:0 0 16px}.hero-banner .banner-prev,.hero-banner .banner-next{position:absolute;top:50%;transform:translateY(-50%);z-index:4;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.9);color:var(--indigo);font-size:1.5rem}.hero-banner .banner-prev{left:12px}.hero-banner .banner-next{right:12px}.hero-banner .banner-dots{position:absolute;z-index:5;bottom:11px;left:50%;right:auto;transform:translateX(-50%);display:flex;justify-content:center;gap:6px}.hero-banner .banner-dots button{width:7px;height:7px;padding:0;border-radius:50%;background:rgba(255,255,255,.58);transition:transform .15s,background .15s}.hero-banner .banner-dots button.active{background:#fff;transform:scale(1.2)}
   @media(max-width:760px){.hero .wrap{grid-template-columns:1fr}.hero-banner{height:${Math.max(220,Math.min(480,Number(first.mobileHeight)||260))}px;transform:none!important}.hero-banner .banner-copy{left:20px;right:20px;bottom:22px}.hero-banner .banner-copy h2{font-size:1.35rem}.hero-banner .banner-copy p{font-size:.8rem}.hero-media-bg{background-position:${position}}}
  `;document.head.appendChild(css);
  if(originalWrap)originalWrap.remove();
  if(placement==="hero"&&hero){
   hero.classList.add("has-hero-media");
   const media=first.image||first.video;
   if(media){const bgEl=document.createElement("div");bgEl.className="hero-media-bg";bgEl.style.backgroundImage=`url("${esc(media)}")`;hero.prepend(bgEl)}
   const ov=document.createElement("div");ov.className="hero-media-overlay";hero.prepend(ov);
  }
  if(ticket){ticket.innerHTML="";ticket.appendChild(c);c.classList.add("hero-banner");ticket.style.padding="0";ticket.style.overflow="hidden";ticket.style.borderRadius=radius+"px";ticket.style.minHeight=height+"px";}
  c.innerHTML=items.map((b,i)=>{const media=b.video||b.image;const isVideo=!!b.video;const bgc=b.backgroundColor||bg;return `<article class="banner-slide ${i===0?"show":""}" style="background:${esc(bgc)}"><div class="banner-shade" style="opacity:${Math.max(0,Math.min(1,Number(b.overlay??overlay)))}"></div>${media?(isVideo?`<video class="banner-media" src="${esc(media)}" autoplay muted loop playsinline preload="metadata"></video>`:`<img class="banner-media" src="${esc(media)}" alt="${esc(b.title)}" loading="${i===0?"eager":"lazy"}" decoding="async">`):""}<div class="banner-copy"><div class="section-tag" style="color:var(--amber)">${esc(b.badge||"Featured")}</div><h2>${esc(b.title)}</h2><p>${esc(b.subtitle)}</p>${b.button?`<a class="btn btn-primary" href="${esc(b.link||"#")}">${esc(b.button)}</a>`:""}</div></article>`}).join("");
  let i=0;const show=n=>{i=(n+items.length)%items.length;c.querySelectorAll(".banner-slide").forEach((x,j)=>x.classList.toggle("show",j===i));c.querySelectorAll("[data-dot]").forEach((x,j)=>x.classList.toggle("active",j===i));};
  if(items.length>1){c.insertAdjacentHTML("beforeend",`<button class="banner-prev" type="button" aria-label="Previous banner">‹</button><button class="banner-next" type="button" aria-label="Next banner">›</button><div class="banner-dots">${items.map((_,j)=>`<button type="button" data-dot="${j}" class="${j===0?"active":""}" aria-label="Banner ${j+1}"></button>`).join("")}</div>`);c.querySelector(".banner-prev").onclick=()=>show(i-1);c.querySelector(".banner-next").onclick=()=>show(i+1);c.querySelectorAll("[data-dot]").forEach(x=>x.onclick=()=>show(+x.dataset.dot));setInterval(()=>show(i+1),5000)}
 }catch(err){console.error("PMT banner init failed",err)}
}
document.addEventListener("DOMContentLoaded",initBanners);
