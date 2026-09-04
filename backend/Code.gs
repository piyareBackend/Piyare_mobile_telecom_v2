/**
 * Piyare Mobile Telecom — v5.1 Production API (single final backend)
 * Storage: Google Sheets + Google Drive.
 * Keep this file server-side. Never put secrets in frontend files.
 */
const CFG={SESSION_SECONDS:21600,LOGIN_WINDOW_SECONDS:900,MAX_LOGIN_ATTEMPTS:8,MAX_UPLOAD_BYTES:5*1024*1024,PUBLIC_RATE_SECONDS:30,MAX_TEXT:1000};
function P(k){return PropertiesService.getScriptProperties().getProperty(k)||"";}
function DB(){const id=P("PMT_SPREADSHEET_ID");if(!id)throw Error("PMT_SPREADSHEET_ID is not configured");return SpreadsheetApp.openById(id);}
function S(n){return DB().getSheetByName(n);}
function J(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
function now_(){return new Date();}
function clean_(v,max){return String(v==null?"":v).replace(/[\u0000-\u001F\u007F]/g," ").trim().slice(0,max||CFG.MAX_TEXT);}
function email_(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||""));}
function phone_(v){return /^[6-9][0-9]{9}$/.test(String(v||""));}
function roleRank_(r){return ({Support:10,Editor:20,Manager:30,Owner:40}[String(r||"")]||0);}
function roleAllowed_(session,min){return !!session&&roleRank_(session.role)>=roleRank_(min);}
function forbidden_(){return J({ok:false,message:"Forbidden"});}
function requireRole_(s,min){return roleAllowed_(s,min);}
function hash_(password,salt){const b=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(salt)+"\u0000"+String(password),Utilities.Charset.UTF_8);return Utilities.base64EncodeWebSafe(b).replace(/=+$/,'');}
function sha_(text){return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(text),Utilities.Charset.UTF_8)).replace(/=+$/,'');}
function token_(){return Utilities.getUuid().replace(/-/g,"")+Utilities.getUuid().replace(/-/g,"");}
function auth_(token){if(!token||String(token).length<40)return null;const raw=CacheService.getScriptCache().get("session_"+token);if(!raw)return null;try{return JSON.parse(raw);}catch(e){return null;}}
function logout_(token){CacheService.getScriptCache().remove("session_"+token);return J({ok:true});}
function safeStatus_(sheet,status){const maps={Orders:["Pending","Confirmed","Processing","Shipped","Delivered","Cancelled","Completed"],Repairs:["Pending","Received","Diagnosing","Repairing","Ready","Delivered","Cancelled","Completed"]};const a=maps[sheet]||[];return a.indexOf(String(status))>=0?String(status):"";}
function doGet(e){
  const a=clean_(e&&e.parameter?e.parameter.action:"",60),p=e&&e.parameter?e.parameter:{};
  try{
    if(a==="content")return content_();
    if(a==="track")return track_(clean_(p.ticket,40));
    if(a==="publicProducts")return publicProducts_();
    if(a==="publicCoupons")return publicCoupons_();
    const modules=["dashboard","analytics","homepage","products","orders","repairs","coupons","reviews","notifications","lowStock","users","feedback","activity","customers"];
    if(modules.indexOf(a)>=0){
      const session=auth_(clean_(p.token,160));if(!session)return forbidden_();
      const minimum={dashboard:"Support",analytics:"Support",homepage:"Editor",products:"Manager",orders:"Support",repairs:"Support",coupons:"Manager",reviews:"Manager",notifications:"Support",lowStock:"Support",users:"Owner",feedback:"Support",activity:"Owner",customers:"Support"}[a];
      if(!roleAllowed_(session,minimum))return forbidden_();
      if(a==="dashboard"||a==="analytics")return analytics_();
      if(["homepage","products","orders","repairs","coupons","reviews","notifications","lowStock","users"].indexOf(a)>=0)return ownerModule_(a);
      if(a==="feedback")return feedback_();if(a==="activity")return activity_();if(a==="customers")return customers_();
    }
    return J({ok:true,service:"PMT Owner API",version:"5.1"});
  }catch(err){auditSafe_("get_error",String(err&&err.message||err));return J({ok:false,message:"Server error"});}
}
function doPost(e){
  let b={};try{b=JSON.parse((e.postData&&e.postData.contents)||"{}");}catch(err){return J({ok:false,message:"Invalid request"});}
  const a=clean_(b.action,60);
  try{
    if(a==="adminLogin")return login_(clean_(b.username,80),String(b.password||""));
    if(a==="createRepair")return createRepair_(b.payload||{});
    if(a==="createFeedback")return createFeedback_(b.payload||{});
    if(a==="createOrder")return createOrder_(b.payload||{});
    if(a==="analyticsEvent"){analyticsEvent_(b);return J({ok:true});}
    const session=auth_(b.token);if(!session)return J({ok:false,message:"Unauthorized"});
    if(a==="logout")return logout_(b.token);
    if(a==="saveContent")return requireRole_(session,"Editor")?saveContent_(b.content||{},session):forbidden_();
    if(a==="uploadImage")return requireRole_(session,"Editor")?uploadImage_(b,session):forbidden_();
    if(a==="createBackup")return requireRole_(session,"Owner")?backupCreate_(session):forbidden_();
    if(a==="restoreBackup")return requireRole_(session,"Owner")?restoreBackup_(clean_(b.snapshotId,120),session):forbidden_();
    if(a==="createUser")return requireRole_(session,"Owner")?createUser_(b.payload||{},session):forbidden_();
    if(a==="updateUser")return requireRole_(session,"Owner")?updateUser_(b.payload||{},session):forbidden_();
    if(a==="createProduct")return requireRole_(session,"Manager")?createProduct_(b.payload||{},session):forbidden_();
    if(a==="updateProduct")return requireRole_(session,"Manager")?updateProduct_(b.payload||{},session):forbidden_();
    if(a==="deleteProduct")return requireRole_(session,"Manager")?deleteProduct_(b.payload||{},session):forbidden_();
    if(a==="createCoupon")return requireRole_(session,"Manager")?createCoupon_(b.payload||{},session):forbidden_();
    if(a==="updateCoupon")return requireRole_(session,"Manager")?updateCoupon_(b.payload||{},session):forbidden_();
    if(a==="updateOrder")return requireRole_(session,"Manager")?updateOrder_(b.payload||{},session):forbidden_();
    if(a==="updateRepair")return requireRole_(session,"Support")?updateRepair_(b.payload||{},session):forbidden_();
    if(a==="updateReview")return requireRole_(session,"Manager")?updateReview_(b.payload||{},session):forbidden_();
    return J({ok:false,message:"Unknown action"});
  }catch(err){auditSafe_("server_error",String(err&&err.message||err));return J({ok:false,message:"Server error"});}
}
function login_(username,password){
  if(!username||!password||password.length<10)return J({ok:false,message:"Invalid credentials"});
  const cache=CacheService.getScriptCache(),key="login_fail_"+Utilities.base64EncodeWebSafe(username).slice(0,80);let attempts=Number(cache.get(key)||0);
  if(attempts>=CFG.MAX_LOGIN_ATTEMPTS)return J({ok:false,message:"Too many attempts. Try again later."});
  const s=S("Users");if(!s)return J({ok:false,message:"Users sheet is not configured"});const r=s.getDataRange().getValues();let user=null,row=0;
  for(let i=1;i<r.length;i++)if(String(r[i][1]).toLowerCase()===username.toLowerCase()){user=r[i];row=i+1;break;}
  if(!user||String(user[6]||"Active")!=="Active"||hash_(password,user[2])!==String(user[3])){cache.put(key,String(attempts+1),CFG.LOGIN_WINDOW_SECONDS);return J({ok:false,message:"Invalid credentials"});}
  cache.remove(key);const t=token_();cache.put("session_"+t,JSON.stringify({userId:String(user[0]),username:String(user[1]),name:String(user[4]),role:String(user[5]),row:row}),CFG.SESSION_SECONDS);audit_("login",String(user[1]));
  return J({ok:true,token:t,user:{name:String(user[4]),role:String(user[5])},expiresIn:CFG.SESSION_SECONDS});
}
function content_(){const s=S("SiteContent");if(!s)return J({ok:true,content:{}});const r=s.getDataRange().getValues(),o={};for(let i=1;i<r.length;i++)if(r[i][0]){try{o[r[i][0]]=JSON.parse(r[i][1]);}catch(e){o[r[i][0]]=String(r[i][1]);}}return J({ok:true,content:o});}
function saveContent_(c,session){const s=S("SiteContent");if(!s)return J({ok:false,message:"SiteContent sheet missing"});const allowed=["site","home","trust","banners","footer","seo"];const r=s.getDataRange().getValues(),map={};for(let i=1;i<r.length;i++)map[String(r[i][0])]=i+1;Object.keys(c).filter(k=>allowed.indexOf(k)>=0).forEach(k=>{const v=JSON.stringify(c[k]);if(v.length>30000)throw Error("Content block too large");map[k]?s.getRange(map[k],2).setValue(v):s.appendRow([k,v]);});audit_("content_edit",session.username);return J({ok:true});}
function publicRate_(kind,key){const c=CacheService.getScriptCache(),k="pub_"+kind+"_"+Utilities.base64EncodeWebSafe(String(key||"unknown")).slice(0,80);if(c.get(k))return false;c.put(k,"1",CFG.PUBLIC_RATE_SECONDS);return true;}
function createRepair_(p){p=p||{};const ph=clean_(p.phone,10);if(!phone_(ph))return J({ok:false,message:"Invalid phone"});if(!publicRate_("repair",ph))return J({ok:false,message:"Please wait before submitting again."});const s=S("Repairs");if(!s)return J({ok:false,message:"Service unavailable"});const id="PMT-"+new Date().getFullYear()+"-"+Utilities.getUuid().slice(0,8).toUpperCase();s.appendRow([id,now_(),clean_(p.name,80),ph,clean_(p.device,100),clean_(p.issue,500),clean_(p.notes,1000),"Pending","",""]);notification_("repair_received","Repair request "+id+" received",ph);auditSafe_("repair_create",id);return J({ok:true,ticket:id,message:"Repair request received"});}
function createFeedback_(p){p=p||{};const msg=clean_(p.message,1000),rating=Number(p.rating||5);if(msg.length<2||rating<1||rating>5)return J({ok:false,message:"Invalid feedback"});const ph=clean_(p.phone,10);if(ph&&!phone_(ph))return J({ok:false,message:"Invalid phone"});if(!publicRate_("feedback",ph||"anon"))return J({ok:false,message:"Please wait before submitting again."});const s=S("Feedback");if(!s)return J({ok:false,message:"Service unavailable"});s.appendRow([Utilities.getUuid(),now_(),clean_(p.name||"Customer",80),ph,rating,msg,"New"]);notification_("feedback","New customer feedback received");return J({ok:true,message:"Feedback received"});}
function createOrder_(p){
  p=p||{};const name=clean_(p.name,80),ph=clean_(p.phone,10),items=Array.isArray(p.items)?p.items:[];if(!name||!phone_(ph)||!items.length)return J({ok:false,message:"Name, valid phone and at least one item are required"});if(!publicRate_("order",ph))return J({ok:false,message:"Please wait before submitting another order."});
  const ps=S("Products"),os=S("Orders");if(!ps||!os)return J({ok:false,message:"Service unavailable"});
  const lock=LockService.getScriptLock();let locked=false;
  try{
    lock.waitLock(10000);locked=true;
    const rows=ps.getDataRange().getValues(),map={};for(let i=1;i<rows.length;i++)map[String(rows[i][0])]={row:i+1,name:String(rows[i][1]),price:Number(rows[i][3]||0),stock:Number(rows[i][4]||0)};
    let total=0,cleanItems=[];for(const it of items){const x=map[String(it.id)];const q=Math.max(1,Math.min(99,Number(it.qty)||1));if(!x)return J({ok:false,message:"Product not found: "+clean_(it.id,80)});if(x.stock<q)return J({ok:false,message:x.name+" is out of stock"});total+=x.price*q;cleanItems.push({id:String(it.id),name:x.name,qty:q,price:x.price});}
    const coupon=clean_(p.coupon,40);let discount=0;if(coupon){const cs=S("Coupons");if(cs){const cr=cs.getDataRange().getValues();for(let i=1;i<cr.length;i++){if(String(cr[i][1]).toUpperCase()===coupon.toUpperCase()&&cr[i][5]!==false){const exp=cr[i][4]?new Date(cr[i][4]):null;if(!exp||isNaN(exp.getTime())||exp>=new Date()){const type=String(cr[i][2]||"percent");const val=Number(cr[i][3]||0);discount=type.toLowerCase()==="flat"?Math.min(val,total):Math.min(Math.round(total*val/100),total);}break;}}}}
    const finalTotal=Math.max(total-discount,0),id="PMT-ORD-"+new Date().getFullYear()+"-"+Utilities.getUuid().slice(0,8).toUpperCase();os.appendRow([id,now_(),name,ph,JSON.stringify(cleanItems),finalTotal,"WhatsApp","Pending"]);
    for(const it of cleanItems){const x=map[it.id];ps.getRange(x.row,5).setValue(Math.max(0,x.stock-it.qty));ps.getRange(x.row,7).setValue(now_());}
    upsertCustomer_(name,ph);notification_("order_received","Order "+id+" received",ph);auditSafe_("order_create",id);return J({ok:true,id:id,total:finalTotal,discount:discount,message:"Order received"});
  }catch(err){return J({ok:false,message:"Server error"});}
  finally{if(locked)lock.releaseLock();}
}
function analyticsEvent_(b){const event=clean_(b.event,60),path=clean_(b.path,200);if(!event||!publicRate_("analytics",event+path))return;const s=S("Analytics");if(s)s.appendRow([now_(),event,path,JSON.stringify(b.meta||{}).slice(0,1000)]);}
function analytics_(){const s=S("Analytics");let c={};if(s){const r=s.getDataRange().getValues();for(let i=1;i<r.length;i++){const e=String(r[i][1]);c[e]=(c[e]||0)+1;}}const orders=S("Orders"),repairs=S("Repairs");let orderCount=0,repairCount=0,revenue=0;if(orders){const r=orders.getDataRange().getValues();orderCount=Math.max(0,r.length-1);for(let i=1;i<r.length;i++)revenue+=Number(r[i][5]||0);}if(repairs)repairCount=Math.max(0,repairs.getLastRow()-1);const feedback=S("Feedback")?Math.max(0,S("Feedback").getLastRow()-1):0;const low=moduleData_("Products",x=>({name:String(x[1]),stock:Number(x[4]||0),minimum:Number(x[5]||0)})).filter(x=>x.stock<=x.minimum);return J({ok:true,visitors:c.page_view||0,pageViews:c.page_view||0,shopClicks:c.shop_click||0,repairLeads:c.repair_submit||0,whatsappClicks:c.whatsapp_click||0,feedback,orders:orderCount,repairs:repairCount,revenue,alerts:low.slice(0,10).map(x=>x.name+" is low: "+x.stock+" left")});}
