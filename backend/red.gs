/**
 * Piyare Mobile Telecom — CONSOLIDATED backend (single source of truth).
 * Replaces: Code.gs, Code_v52_patch.gs, Code_v52_routes.gs, ZZ_HardDelete.gs,
 *           ZZ_ProductFix.gs, ZZZ_OrderFix.gs — delete all of those, keep only this file.
 * Reason: multiple files each redefined doGet/doPost, causing inconsistent behavior
 * (revenue counting non-Confirmed orders, in-app reject not restoring stock, stale cache).
 */
const CFG={SESSION_SECONDS:21600,LOGIN_WINDOW_SECONDS:900,MAX_LOGIN_ATTEMPTS:8,MAX_UPLOAD_BYTES:5*1024*1024,PUBLIC_RATE_SECONDS:30,MAX_TEXT:1000};
const PRODUCT_HEADERS=['id','name','sku','price','stock','minimum','updated','icon','category','description','images','variants','specifications','compatibility','whatsInBox','seoTitle','seoDescription','deletedAt','status','mainImage','imageSettings'];
const ORDER_HEADERS=['id','date','customer','phone','items','total','payment','status','actionToken'];
// Orders in these statuses count toward revenue. Pending/Rejected/Cancelled never do.
const REVENUE_STATUSES=['Confirmed','Processing','Shipped','Delivered','Completed'];
// Moving an order INTO one of these statuses restores stock (only once — guarded below).
const STOCK_RESTORE_STATUSES=['Rejected','Cancelled'];
const CACHE_KEYS=['pmt:Products','pmt:Orders','pmt:Dashboard'];

/* ---------- Core helpers ---------- */
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
function forbidden_(){return J({ok:false,error:"Forbidden",message:"Forbidden"});}
function requireRole_(s,min){return roleAllowed_(s,min);}
function hash_(password,salt){const b=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(salt)+"\u0000"+String(password),Utilities.Charset.UTF_8);return Utilities.base64EncodeWebSafe(b).replace(/=+$/,'');}
function sha_(text){return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(text),Utilities.Charset.UTF_8)).replace(/=+$/,'');}
function token_(){return Utilities.getUuid().replace(/-/g,"")+Utilities.getUuid().replace(/-/g,"");}
function auth_(token){if(!token||String(token).length<40)return null;const raw=CacheService.getScriptCache().get("session_"+token);if(!raw)return null;try{return JSON.parse(raw);}catch(e){return null;}}
function logout_(token){CacheService.getScriptCache().remove("session_"+token);return J({ok:true});}
function maskPhone_(p){p=String(p||"");return p.length>=4?"••••••"+p.slice(-4):"••••••••••";}
function htmlEscape_(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function publicRate_(kind,key){const c=CacheService.getScriptCache(),k="pub_"+kind+"_"+Utilities.base64EncodeWebSafe(String(key||"unknown")).slice(0,80);if(c.get(k))return false;c.put(k,"1",CFG.PUBLIC_RATE_SECONDS);return true;}
function audit_(action,detail){const s=S("ActivityLog");if(s)s.appendRow([now_(),clean_(action,80),clean_(detail,500)]);}
function auditSafe_(a,d){try{audit_(a,d);}catch(e){}}

/* ---------- Cache: clear on EVERY mutation so admin app / website never see stale data ---------- */
function clearCache_(){try{CacheService.getScriptCache().removeAll(CACHE_KEYS);}catch(e){}}

/* ---------- Products ---------- */
function ensureProductSchema_(s){const width=Math.max(s.getLastColumn(),PRODUCT_HEADERS.length);const first=s.getRange(1,1,1,width).getValues()[0];let changed=false;for(let i=0;i<PRODUCT_HEADERS.length;i++)if(!first[i]){first[i]=PRODUCT_HEADERS[i];changed=true;}if(changed||s.getLastColumn()<PRODUCT_HEADERS.length)s.getRange(1,1,1,PRODUCT_HEADERS.length).setValues([PRODUCT_HEADERS]);}
function jsonSafe_(v,fallback){if(Array.isArray(v)||typeof v==='object')return v;const s=String(v||'').trim();if(!s)return fallback;try{return JSON.parse(s);}catch(e){return fallback;}}
function imageList_(v){let a=v;if(typeof v==='string'){const s=v.trim();if(!s)return [];try{a=JSON.parse(s);}catch(e){a=[s];}}if(!Array.isArray(a))a=[a];return a.map(x=>{if(x&&typeof x==='object')return x.url||x.src||x.href||x.image||x.fileUrl||x.file||x.id||'';return String(x||'');}).map(x=>String(x||'').trim()).filter(Boolean).slice(0,5);}
function productMap_(x){return {id:String(x[0]),name:String(x[1]),sku:String(x[2]),price:Number(x[3]||0),stock:Number(x[4]||0),minimum:Number(x[5]||0),updated:String(x[6]||''),icon:String(x[7]||'📱'),category:String(x[8]||'Accessories'),description:String(x[9]||''),images:imageList_(x[10]),variants:jsonSafe_(x[11],[]),specifications:jsonSafe_(x[12],[]),compatibility:String(x[13]||''),whatsInBox:String(x[14]||''),seoTitle:String(x[15]||x[1]||''),seoDescription:String(x[16]||x[9]||''),deletedAt:String(x[17]||''),status:String(x[18]||'Active'),mainImage:Math.max(0,Number(x[19]||0)),imageSettings:jsonSafe_(x[20],{})};}
function productRows_(){const s=S('Products');if(!s)return [];ensureProductSchema_(s);const r=s.getDataRange().getValues();return r.length>1?r.slice(1).map(productMap_):[];}
function publicProducts_(){const items=productRows_().filter(x=>x.status!=='Archived'&&!x.deletedAt);return J({ok:true,data:items,items});}
function adminProducts_(){const items=productRows_();return J({ok:true,data:items,items});}
function createProduct_(p,session){
  const s=S('Products');if(!s)return J({ok:false,error:'Products sheet missing',code:'PRODUCTS_SHEET_MISSING'});
  ensureProductSchema_(s);p=p||{};
  const name=clean_(p.name,100),sku=clean_(p.sku,80),price=Number(p.price),stock=Math.max(0,Number(p.stock)||0),minimum=Math.max(0,Number(p.minimum)||0);
  if(!name||!isFinite(price)||price<0)return J({ok:false,error:'Invalid product data',code:'PRODUCT_INVALID'});
  const variants=Array.isArray(p.variants)?p.variants.slice(0,30).map(v=>({id:clean_(v.id||Utilities.getUuid().slice(0,8),40),name:clean_(v.name||v.label,80),sku:clean_(v.sku,80),price:Math.max(0,Number(v.price)||0),stock:Math.max(0,Number(v.stock)||0),color:clean_(v.color,40),image:clean_(v.image,1200)})).filter(v=>v.name):[];
  const images=imageList_(p.images),main=Math.max(0,Math.min(Math.max(images.length-1,0),Number(p.mainImage)||0)),id='PRD-'+Utilities.getUuid().slice(0,8).toUpperCase();
  s.appendRow([id,name,sku,price,stock,minimum,now_(),clean_(p.icon||'📱',8),clean_(p.category||'Accessories',60),clean_(p.description,5000),JSON.stringify(images),JSON.stringify(variants),JSON.stringify(p.specifications||[]),clean_(p.compatibility,3000),clean_(p.whatsInBox,3000),clean_(p.seoTitle||name,160),clean_(p.seoDescription||p.description,300),'','Active',main,JSON.stringify(p.imageSettings&&typeof p.imageSettings==='object'?p.imageSettings:{})]);
  clearCache_();audit_('product_create',id);return J({ok:true,data:{id},id});
}
function updateProduct_(p,session){
  const s=S('Products');if(!s)return J({ok:false,error:'Products sheet missing',code:'PRODUCTS_SHEET_MISSING'});
  ensureProductSchema_(s);const id=clean_(p&&p.id,120);if(!id)return J({ok:false,error:'Product id is required',code:'PRODUCT_ID_REQUIRED'});
  const r=s.getDataRange().getValues();
  for(let i=1;i<r.length;i++)if(String(r[i][0])===id){
    const row=i+1;
    if(p.name!=null)s.getRange(row,2).setValue(clean_(p.name,100));
    if(p.sku!=null)s.getRange(row,3).setValue(clean_(p.sku,80));
    if(p.price!=null)s.getRange(row,4).setValue(Math.max(0,Number(p.price)||0));
    if(p.stock!=null)s.getRange(row,5).setValue(Math.max(0,Number(p.stock)||0));
    if(p.minimum!=null)s.getRange(row,6).setValue(Math.max(0,Number(p.minimum)||0));
    if(p.icon!=null)s.getRange(row,8).setValue(clean_(p.icon,8));
    if(p.category!=null)s.getRange(row,9).setValue(clean_(p.category,60));
    if(p.description!=null)s.getRange(row,10).setValue(clean_(p.description,5000));
    if(p.images!=null)s.getRange(row,11).setValue(JSON.stringify(imageList_(p.images)));
    if(p.variants!=null)s.getRange(row,12).setValue(JSON.stringify(Array.isArray(p.variants)?p.variants.slice(0,30):[]));
    if(p.specifications!=null)s.getRange(row,13).setValue(JSON.stringify(p.specifications));
    if(p.compatibility!=null)s.getRange(row,14).setValue(clean_(p.compatibility,3000));
    if(p.whatsInBox!=null)s.getRange(row,15).setValue(clean_(p.whatsInBox,3000));
    if(p.seoTitle!=null)s.getRange(row,16).setValue(clean_(p.seoTitle,160));
    if(p.seoDescription!=null)s.getRange(row,17).setValue(clean_(p.seoDescription,300));
    if(p.deletedAt!=null)s.getRange(row,18).setValue(clean_(p.deletedAt,80));
    if(p.status!=null)s.getRange(row,19).setValue(String(p.status)==='Archived'?'Archived':'Active');
    if(p.mainImage!=null)s.getRange(row,20).setValue(Math.max(0,Number(p.mainImage)||0));
    if(p.imageSettings!=null)s.getRange(row,21).setValue(JSON.stringify(p.imageSettings&&typeof p.imageSettings==='object'?p.imageSettings:{}));
    s.getRange(row,7).setValue(now_());
    clearCache_();audit_('product_update',id);return J({ok:true,data:{id},id});
  }
  return J({ok:false,error:'Product not found',code:'PRODUCT_NOT_FOUND'});
}
function deleteProduct_(p,session){
  if(!roleAllowed_(session,'Manager'))return forbidden_();
  const s=S('Products');if(!s)return J({ok:false,error:'Products sheet missing',code:'PRODUCTS_SHEET_MISSING'});
  const id=clean_(p&&p.id,120);if(!id)return J({ok:false,error:'Product id is required',code:'PRODUCT_ID_REQUIRED'});
  const r=s.getDataRange().getValues();
  for(let i=1;i<r.length;i++)if(String(r[i][0])===id){
    const name=String(r[i][1]||id);s.deleteRow(i+1);
    clearCache_();audit_('product_delete',id+' | '+name);
    return J({ok:true,data:{id},id,message:'Product deleted permanently. Drive media was not deleted.'});
  }
  return J({ok:false,error:'Product not found',code:'PRODUCT_NOT_FOUND'});
}
function uploadImage_(b,session){
  const data=String(b&&b.base64||'').replace(/^data:[^;]+;base64,/i,'').trim();
  if(!data)return J({ok:false,error:'Image data is required',code:'IMAGE_DATA_REQUIRED'});
  const mime=String(b.mime||'').toLowerCase();
  if(['image/jpeg','image/png','image/webp'].indexOf(mime)<0)return J({ok:false,error:'Only JPG, PNG and WebP are allowed',code:'IMAGE_TYPE_INVALID'});
  const bytes=Utilities.base64Decode(data);
  if(bytes.length>CFG.MAX_UPLOAD_BYTES)return J({ok:false,error:'Image exceeds 5 MB',code:'IMAGE_TOO_LARGE'});
  const folder=DriveApp.getFolderById(P('PMT_MEDIA_FOLDER_ID'));
  const safe=clean_(b.filename||'image',120).replace(/[^a-z0-9._-]/gi,'_')||'image';
  const file=folder.createFile(Utilities.newBlob(bytes,mime,Utilities.getUuid().replace(/-/g,'').slice(0,12)+'-'+safe));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
  const id=file.getId(),url='https://drive.google.com/thumbnail?id='+encodeURIComponent(id)+'&sz=w1600';
  audit_('media_upload',id);
  return J({ok:true,id,url,thumbnailUrl:url,driveUrl:'https://drive.google.com/uc?export=view&id='+encodeURIComponent(id)});
}

/* ---------- Orders ---------- */
function ensureOrderSchema_(s){if(s.getLastColumn()<ORDER_HEADERS.length)s.insertColumnAfter(Math.max(1,s.getLastColumn()));const h=s.getRange(1,1,1,Math.max(ORDER_HEADERS.length,s.getLastColumn())).getValues()[0];let changed=false;for(let i=0;i<ORDER_HEADERS.length;i++)if(!h[i]){h[i]=ORDER_HEADERS[i];changed=true;}if(changed)s.getRange(1,1,1,ORDER_HEADERS.length).setValues([ORDER_HEADERS]);}
function orderMap_(x){let items=[];try{items=JSON.parse(String(x[4]||'[]'));}catch(e){}return {id:String(x[0]),date:String(x[1]),customer:String(x[2]),phoneMasked:maskPhone_(String(x[3]||'')),phone:String(x[3]||''),items,total:Number(x[5]||0),payment:String(x[6]||''),status:String(x[7]||'Pending'),actionToken:String(x[8]||'')};}
function freshOrders_(){const s=S('Orders');if(!s)return [];ensureOrderSchema_(s);const r=s.getDataRange().getValues();return r.length>1?r.slice(1).map(orderMap_).reverse():[];}
function orderById_(id){const s=S('Orders');if(!s)return null;ensureOrderSchema_(s);const r=s.getDataRange().getValues();for(let i=1;i<r.length;i++)if(String(r[i][0])===id)return {row:i+1,order:orderMap_(r[i])};return null;}
function ordersAdmin_(){return J({ok:true,data:freshOrders_(),items:freshOrders_()});}
function orderDetail_(id){const found=orderById_(id);return found?J({ok:true,order:found.order}):J({ok:false,message:'Order not found'});}

function createOrder_(p){
  p=p||{};const name=clean_(p.name,80),ph=clean_(p.phone,10),items=Array.isArray(p.items)?p.items:[];
  if(!name||!phone_(ph)||!items.length)return J({ok:false,message:'Name, valid phone and at least one item are required'});
  if(!publicRate_('order',ph))return J({ok:false,message:'Please wait before submitting another order.'});
  const ps=S('Products'),os=S('Orders');if(!ps||!os)return J({ok:false,message:'Service unavailable'});
  ensureOrderSchema_(os);
  const lock=LockService.getScriptLock();let locked=false;
  try{
    lock.waitLock(10000);locked=true;
    const rows=ps.getDataRange().getValues(),map={};
    for(let i=1;i<rows.length;i++){const x=productMap_(rows[i]);if(x.status==='Archived'||x.deletedAt)continue;map[x.id]={row:i+1,p:x};}
    let total=0,cleanItems=[];
    for(const it of items){
      const x=map[String(it&&it.id||'')],q=Math.max(1,Math.min(99,Number(it&&it.qty)||1));
      if(!x)return J({ok:false,message:'Product not found: '+clean_(it&&it.id,80)});
      let price=x.p.price,stock=x.p.stock,variant=null;
      if(it&&it.variantId){
        variant=Array.isArray(x.p.variants)?x.p.variants.find(v=>String(v.id)===String(it.variantId)):null;
        if(!variant)return J({ok:false,message:'Variant not found'});
        price=Number(variant.price||price);stock=Number(variant.stock||0);
      }
      if(stock<q)return J({ok:false,message:x.p.name+' is out of stock'});
      total+=price*q;
      cleanItems.push({id:x.p.id,variantId:variant?String(variant.id):'',variant:variant?String(variant.name||''):'',name:x.p.name,qty:q,price});
    }
    const coupon=clean_(p.coupon,40);let discount=0;
    if(coupon){
      const cs=S('Coupons');
      if(cs){const cr=cs.getDataRange().getValues();for(let i=1;i<cr.length;i++)if(String(cr[i][1]).toUpperCase()===coupon.toUpperCase()&&cr[i][5]!==false){const exp=cr[i][4]?new Date(cr[i][4]):null;if(!exp||isNaN(exp.getTime())||exp>=new Date()){const type=String(cr[i][2]||'percent'),val=Number(cr[i][3]||0);discount=type.toLowerCase()==='flat'?Math.min(val,total):Math.min(Math.round(total*val/100),total);}break;}}
    }
    const finalTotal=Math.max(total-discount,0),id='PMT-ORD-'+new Date().getFullYear()+'-'+Utilities.getUuid().slice(0,8).toUpperCase(),actionToken=token_();
    os.appendRow([id,now_(),name,ph,JSON.stringify(cleanItems),finalTotal,'WhatsApp','Pending',actionToken]);
    for(const it of cleanItems){
      const x=map[it.id];
      if(it.variantId){
        const arr=x.p.variants.map(v=>String(v.id)===String(it.variantId)?Object.assign({},v,{stock:Math.max(0,Number(v.stock||0)-it.qty)}):v);
        ps.getRange(x.row,12).setValue(JSON.stringify(arr));
      }else{
        ps.getRange(x.row,5).setValue(Math.max(0,x.p.stock-it.qty));
      }
      ps.getRange(x.row,7).setValue(now_());
    }
    upsertCustomer_(name,ph);
    notification_('order_received','Order '+id+' received',ph,id,actionToken);
    clearCache_();auditSafe_('order_create',id);
    return J({ok:true,id,total:finalTotal,discount,message:'Order received'});
  }catch(err){auditSafe_('order_create_error',String(err&&err.message||err));return J({ok:false,message:'Server error'});}
  finally{if(locked)lock.releaseLock();}
}

/* SHARED core: both the WhatsApp accept/reject links AND the in-app Accept/Reject buttons
   call this SAME function, so behavior (stock restore, cache clear, revenue) can never drift apart. */
function restoreStockForOrder_(ps,items){
  const productRows=ps.getDataRange().getValues(),map={};
  for(let i=1;i<productRows.length;i++){const x=productMap_(productRows[i]);map[x.id]={row:i+1,p:x};}
  const restore={};
  for(const item of items){
    const pid=String(item&&item.id||''),x=map[pid],qty=Math.max(1,Math.min(99,Number(item&&item.qty)||1));
    if(!x)return {ok:false,message:'Product unavailable — a product in this order no longer exists.'};
    const key=item&&item.variantId?pid+'::'+String(item.variantId):pid;
    restore[key]=(restore[key]||0)+qty;
  }
  Object.keys(restore).forEach(key=>{
    const parts=key.split('::'),pid=parts[0],variantId=parts.length>1?parts.slice(1).join('::'):'',x=map[pid];
    if(variantId){
      const arr=Array.isArray(x.p.variants)?x.p.variants.map(v=>String(v.id)===variantId?Object.assign({},v,{stock:Number(v.stock||0)+restore[key]}):v):null;
      if(arr)ps.getRange(x.row,12).setValue(JSON.stringify(arr));
    }else{
      ps.getRange(x.row,5).setValue(Number(x.p.stock||0)+restore[key]);
    }
    ps.getRange(x.row,7).setValue(now_());
  });
  return {ok:true};
}
function changeOrderStatus_(id, newStatus, opts){
  opts=opts||{};
  const os=S('Orders'),ps=S('Products');
  if(!os||!ps)return {ok:false,message:'Service unavailable'};
  ensureOrderSchema_(os);
  const lock=LockService.getScriptLock();let locked=false;
  try{
    lock.waitLock(10000);locked=true;
    const rows=os.getDataRange().getValues();let rowIndex=-1,row=null;
    for(let i=1;i<rows.length;i++)if(String(rows[i][0])===id){rowIndex=i+1;row=rows[i];break;}
    if(rowIndex<0)return {ok:false,message:'Order not found'};
    const currentStatus=String(row[7]||'Pending'),storedToken=String(row[8]||'');
    // Token check only applies to the public WhatsApp accept/reject links.
    if(opts.requireToken){
      if(currentStatus!=='Pending')return {ok:false,alreadyProcessed:true,message:'This order was already processed. Current status: '+currentStatus};
      if(!storedToken||storedToken!==opts.providedToken)return {ok:false,message:'This order link is invalid or has expired.'};
    }
    const willRestoreStock=STOCK_RESTORE_STATUSES.indexOf(newStatus)>=0 && STOCK_RESTORE_STATUSES.indexOf(currentStatus)<0;
    if(willRestoreStock){
      let items=[];try{items=JSON.parse(String(row[4]||'[]'));}catch(e){return {ok:false,message:'Order data error — could not read items.'};}
      const r=restoreStockForOrder_(ps,items);
      if(!r.ok)return r;
    }
    os.getRange(rowIndex,8).setValue(newStatus);
    os.getRange(rowIndex,9).setValue(''); // clear actionToken — single use
    clearCache_();
    auditSafe_('order_status_change',id+' '+currentStatus+' -> '+newStatus);
    notification_('order_status','Order '+id+' status: '+newStatus);
    return {ok:true,id,status:newStatus,stockRestored:willRestoreStock};
  }catch(err){auditSafe_('order_status_error',String(err&&err.message||err));return {ok:false,message:'Server error'};}
  finally{if(locked)lock.releaseLock();}
}
// Called from the in-app admin Accept/Reject/status-change buttons.
function updateOrder_(p,session){
  const id=clean_(p&&p.id,120),status=String(p&&p.status||'');
  const allowed=['Pending','Confirmed','Rejected','Processing','Shipped','Delivered','Cancelled','Completed'];
  if(!id||allowed.indexOf(status)<0)return J({ok:false,message:'Invalid status update'});
  const result=changeOrderStatus_(id,status,{requireToken:false});
  return J(result.ok?{ok:true,id:result.id,status:result.status}:{ok:false,message:result.message||'Update failed'});
}
// Called from the WhatsApp/email accept-reject links (public, token-protected).
function processOrderAction_(p,action){
  const id=clean_(p&&p.id,120),providedToken=clean_(p&&p.token,200);
  if(!id||!providedToken)return orderActionPage_('Invalid order link','The order link is missing required information.');
  if(action!=='accept'&&action!=='reject')return orderActionPage_('Invalid action','This order link contains an invalid action.');
  const newStatus=action==='accept'?'Confirmed':'Rejected';
  const result=changeOrderStatus_(id,newStatus,{requireToken:true,providedToken});
  if(!result.ok){
    if(result.alreadyProcessed)return orderActionPage_('This order was already processed',result.message);
    return orderActionPage_(result.message&&result.message.indexOf('invalid')>=0?'Invalid order link':'Could not process order',result.message||'Please try again later.');
  }
  return action==='accept'
    ? orderActionPage_('Order Accepted','Order '+id+' has been confirmed.')
    : orderActionPage_('Order Rejected','Order '+id+' has been rejected and stock has been restored.');
}
function orderActionPage_(title,message){
  const safeTitle=htmlEscape_(title),safeMessage=htmlEscape_(message);
  return HtmlService.createHtmlOutput('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Arial,sans-serif;background:#f5f7fb;margin:0;padding:24px;display:flex;min-height:100vh;align-items:center;justify-content:center;box-sizing:border-box}.card{background:#fff;width:100%;max-width:480px;padding:28px;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.08);box-sizing:border-box;text-align:center}h1{font-size:24px;margin:0 0 14px;color:#111827}p{font-size:16px;line-height:1.5;color:#4b5563;margin:0}</style></head><body><div class="card"><h1>'+safeTitle+'</h1><p>'+safeMessage+'</p></div></body></html>').setTitle("PMT Order");
}

/* ---------- Dashboard / Analytics / Reports (single consistent revenue rule) ---------- */
function dashboard_(){
  const orders=freshOrders_(),repairs=moduleData_('Repairs',x=>({id:String(x[0])})),
        products=productRows_(),feedback=S('Feedback')?Math.max(0,S('Feedback').getLastRow()-1):0;
  const revenue=orders.filter(x=>REVENUE_STATUSES.indexOf(x.status)>=0).reduce((n,x)=>n+Number(x.total||0),0);
  const active=products.filter(x=>x.status!=='Archived'&&!x.deletedAt);
  const low=active.filter(x=>x.stock>0&&x.stock<=x.minimum);
  const out=active.filter(x=>x.stock<=0);
  return J({ok:true,visitors:0,orders:orders.length,repairs:repairs.length,revenue,todayRevenue:revenue,feedback,productCount:active.length,lowStock:low.length,lowStockCount:low.length,outOfStock:out.length,alerts:low.slice(0,10).map(x=>x.name+' is low: '+x.stock+' left')});
}
function analyticsEvent_(b){const event=clean_(b.event,60),path=clean_(b.path,200);if(!event||!publicRate_('analytics',event+path))return;const s=S('Analytics');if(s)s.appendRow([now_(),event,path,JSON.stringify(b.meta||{}).slice(0,1000)]);}
function analytics_(){
  const s=S('Analytics');let c={};
  if(s){const r=s.getDataRange().getValues();for(let i=1;i<r.length;i++){const e=String(r[i][1]);c[e]=(c[e]||0)+1;}}
  const orders=freshOrders_(),revenue=orders.filter(x=>REVENUE_STATUSES.indexOf(x.status)>=0).reduce((n,x)=>n+Number(x.total||0),0);
  const repairCount=S('Repairs')?Math.max(0,S('Repairs').getLastRow()-1):0;
  const feedback=S('Feedback')?Math.max(0,S('Feedback').getLastRow()-1):0;
  const low=productRows_().filter(x=>x.status!=='Archived'&&x.stock<=x.minimum);
  return J({ok:true,visitors:c.page_view||0,pageViews:c.page_view||0,shopClicks:c.shop_click||0,repairLeads:c.repair_submit||0,whatsappClicks:c.whatsapp_click||0,feedback,orders:orders.length,repairs:repairCount,revenue,alerts:low.slice(0,10).map(x=>x.name+' is low: '+x.stock+' left'),events:Object.keys(c).map(k=>({name:k,count:c[k]})),daily:[c.page_view||0,c.shop_click||0,c.repair_submit||0,c.whatsapp_click||0]});
}
function monthlyReport_(month){
  const key=String(month||'').match(/^\d{4}-\d{2}$/)?String(month):Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM');
  const start=new Date(key+'-01T00:00:00'),end=new Date(start);end.setMonth(end.getMonth()+1);
  const inRange=v=>{const d=new Date(v);return !isNaN(d.getTime())&&d>=start&&d<end;};
  const orders=freshOrders_().filter(x=>inRange(x.date));
  const repairs=moduleData_('Repairs',x=>({id:String(x[0]),date:String(x[1]),name:String(x[2]),device:String(x[4]),issue:String(x[5]),status:String(x[7]||'Pending'),estimate:Number(x[8]||0)})).filter(x=>inRange(x.date));
  const revenue=orders.filter(x=>REVENUE_STATUSES.indexOf(x.status)>=0).reduce((n,x)=>n+Number(x.total||0),0);
  return J({ok:true,month:key,summary:{orders:orders.length,repairs:repairs.length,revenue},orders,repairs});
}
function inventory_(){
  const items=productRows_().filter(x=>x.status!=='Archived'&&!x.deletedAt);
  return J({ok:true,totalProducts:items.length,totalVariants:items.reduce((n,x)=>n+(Array.isArray(x.variants)&&x.variants.length?x.variants.length:1),0),lowStock:items.filter(x=>x.stock>0&&x.stock<=x.minimum),outOfStock:items.filter(x=>x.stock<=0)});
}

/* ---------- Content, repairs, feedback, coupons, reviews, users, backup ---------- */
function content_(){const s=S('SiteContent');if(!s)return J({ok:true,content:{}});const r=s.getDataRange().getValues(),o={};for(let i=1;i<r.length;i++)if(r[i][0]){try{o[r[i][0]]=JSON.parse(r[i][1]);}catch(e){o[r[i][0]]=String(r[i][1]);}}return J({ok:true,content:o});}
function saveContent_(c,session){const s=S('SiteContent');if(!s)return J({ok:false,message:'SiteContent sheet missing'});const allowed=['site','home','trust','banners','footer','seo'],r=s.getDataRange().getValues(),map={};for(let i=1;i<r.length;i++)map[String(r[i][0])]=i+1;Object.keys(c).filter(k=>allowed.indexOf(k)>=0).forEach(k=>{const v=JSON.stringify(c[k]);if(v.length>30000)throw Error('Content block too large');map[k]?s.getRange(map[k],2).setValue(v):s.appendRow([k,v]);});audit_('content_edit',session.username);return J({ok:true});}
function createRepair_(p){p=p||{};const ph=clean_(p.phone,10);if(!phone_(ph))return J({ok:false,message:'Invalid phone'});if(!publicRate_('repair',ph))return J({ok:false,message:'Please wait before submitting again.'});const s=S('Repairs');if(!s)return J({ok:false,message:'Service unavailable'});const id='PMT-'+new Date().getFullYear()+'-'+Utilities.getUuid().slice(0,8).toUpperCase();s.appendRow([id,now_(),clean_(p.name,80),ph,clean_(p.device,100),clean_(p.issue,500),clean_(p.notes,1000),'Pending','','']);notification_('repair_received','Repair request '+id+' received',ph);auditSafe_('repair_create',id);return J({ok:true,ticket:id,message:'Repair request received'});}
function updateRepair_(p,session){const s=S('Repairs');if(!s)return J({ok:false,message:'Unavailable'});const id=clean_(p&&p.id,120),allowed=['Pending','Received','Diagnosing','Repairing','Ready','Delivered','Cancelled','Completed'],status=allowed.indexOf(p&&p.status)>=0?p.status:'';if(!id||!status)return J({ok:false,message:'Invalid status update'});const r=s.getDataRange().getValues();for(let i=1;i<r.length;i++)if(String(r[i][0])===id){s.getRange(i+1,8).setValue(status);if(s.getLastColumn()>=10)s.getRange(i+1,10).setValue(now_());notification_('repair_status',id+' → '+status);audit_('repair_update',id+' → '+status);return J({ok:true});}return J({ok:false,message:'Record not found'});}
function createFeedback_(p){p=p||{};const msg=clean_(p.message,1000),rating=Number(p.rating||5);if(msg.length<2||rating<1||rating>5)return J({ok:false,message:'Invalid feedback'});const ph=clean_(p.phone,10);if(ph&&!phone_(ph))return J({ok:false,message:'Invalid phone'});if(!publicRate_('feedback',ph||'anon'))return J({ok:false,message:'Please wait before submitting again.'});const s=S('Feedback');if(!s)return J({ok:false,message:'Service unavailable'});s.appendRow([Utilities.getUuid(),now_(),clean_(p.name||'Customer',80),ph,rating,msg,'New']);notification_('feedback','New customer feedback received');return J({ok:true,message:'Feedback received'});}
function feedback_(){return J({ok:true,data:moduleData_('Feedback',x=>({id:String(x[0]),date:String(x[1]),name:String(x[2]),phone:String(x[3]||''),rating:Number(x[4]||0),message:String(x[5]),status:String(x[6]||'New')}))});}
function publicCoupons_(){const a=moduleData_('Coupons',x=>({id:String(x[0]),code:String(x[1]),type:String(x[2]||'percent'),value:Number(x[3]||0),expires:String(x[4]||''),active:x[5]!==false})).filter(x=>x.active);return J({ok:true,items:a});}
function coupons_(){return J({ok:true,data:moduleData_('Coupons',x=>({id:String(x[0]),code:String(x[1]),type:String(x[2]||'percent'),value:Number(x[3]||0),expires:String(x[4]||''),active:x[5]!==false}))});}
function createCoupon_(p,session){const s=S('Coupons');if(!s)return J({ok:false,message:'Coupons sheet missing'});const code=clean_(p.code,40).toUpperCase(),type=String(p.type||'percent').toLowerCase(),value=Number(p.value);if(!code||['percent','flat'].indexOf(type)<0||!isFinite(value)||value<0)return J({ok:false,message:'Invalid coupon data'});const id='CPN-'+Utilities.getUuid().slice(0,8).toUpperCase();s.appendRow([id,code,type,value,clean_(p.expires,40),p.active!==false]);audit_('coupon_create',id);return J({ok:true,id});}
function updateCoupon_(p,session){const s=S('Coupons');if(!s)return J({ok:false,message:'Coupons sheet missing'});const id=clean_(p.id,120),r=s.getDataRange().getValues();for(let i=1;i<r.length;i++)if(String(r[i][0])===id){if(p.code!=null)s.getRange(i+1,2).setValue(clean_(p.code,40).toUpperCase());if(p.type!=null)s.getRange(i+1,3).setValue(String(p.type).toLowerCase());if(p.value!=null)s.getRange(i+1,4).setValue(Math.max(0,Number(p.value)||0));if(p.expires!=null)s.getRange(i+1,5).setValue(clean_(p.expires,40));if(p.active!=null)s.getRange(i+1,6).setValue(Boolean(p.active));audit_('coupon_update',id);return J({ok:true});}return J({ok:false,message:'Coupon not found'});}
function reviews_(){return J({ok:true,data:moduleData_('Reviews',x=>({id:String(x[0]),name:String(x[1]),text:String(x[2]),rating:Number(x[3]||0),status:String(x[3]||'Pending'),message:String(x[2]||'')}))});}
function updateReview_(p,session){const s=S('Reviews');if(!s)return J({ok:false,message:'Reviews unavailable'});const id=clean_(p.id,120),status=['Pending','Approved','Hidden','Rejected'].indexOf(p.status)>=0?p.status:'Pending';const r=s.getDataRange().getValues();for(let i=1;i<r.length;i++)if(String(r[i][0])===id){s.getRange(i+1,4).setValue(status);audit_('review_update',id);return J({ok:true});}return J({ok:false,message:'Review not found'});}
function notifications_(){return J({ok:true,data:moduleData_('Notifications',x=>({time:String(x[0]),type:String(x[1]),message:String(x[2]),read:x[3]===true})).slice(-100).reverse()});}
function customers_(){return J({ok:true,data:moduleData_('Customers',x=>({id:String(x[0]),name:String(x[1]),phoneMasked:maskPhone_(String(x[2]||'')),phone:String(x[2]||''),orders:Number(x[3]||0),lastActivity:String(x[4]||'')}))});}
function updateHomepageBlock_(p,session){const s=S('HomepageBlocks');if(!s)return J({ok:false,message:'HomepageBlocks sheet missing'});const id=clean_(p&&p.id,120);if(!id)return J({ok:false,message:'Block id is required'});const r=s.getDataRange().getValues();for(let i=1;i<r.length;i++)if(String(r[i][0])===id){if(p.title!=null)s.getRange(i+1,3).setValue(clean_(p.title,120));if(p.enabled!=null)s.getRange(i+1,4).setValue(Boolean(p.enabled));if(p.position!=null)s.getRange(i+1,5).setValue(Math.max(0,Number(p.position)||0));clearCache_();audit_('homepage_update',id);return J({ok:true});}return J({ok:false,message:'Block not found'});}
function customerDetail_(id){const s=S('Customers');if(!s)return J({ok:false,message:'Customers unavailable'});const r=s.getDataRange().getValues();let row=null;for(let i=1;i<r.length;i++)if(String(r[i][0])===id){row=r[i];break;}if(!row)return J({ok:false,message:'Customer not found'});const phone=String(row[2]||''),orders=freshOrders_().filter(o=>o.phone===phone),repairs=moduleData_('Repairs',x=>({id:String(x[0]),date:String(x[1]),device:String(x[4]),issue:String(x[5]),status:String(x[7]||'Pending')})).filter(x=>String(x[3])===phone);return J({ok:true,customer:{id:String(row[0]),name:String(row[1]),phoneMasked:maskPhone_(phone),orders:Number(row[3]||0),lastActivity:String(row[4]||'')},orders,repairs});}
function upsertCustomer_(name,phone){const s=S('Customers');if(!s)return;const r=s.getDataRange().getValues();for(let i=1;i<r.length;i++)if(String(r[i][2])===phone){s.getRange(i+1,4).setValue(Number(r[i][3]||0)+1);s.getRange(i+1,5).setValue(now_());return;}s.appendRow([Utilities.getUuid(),clean_(name,80),phone,1,now_()]);}
function activity_(){return J({ok:true,data:moduleData_('ActivityLog',x=>({time:String(x[0]),action:String(x[1]),detail:String(x[2])})).slice(-150).reverse()});}
function moduleData_(sheet,mapper){const s=S(sheet);if(!s)return [];const r=s.getDataRange().getValues();return r.length>1?r.slice(1).map(mapper):[];}
function users_(){return J({ok:true,data:moduleData_('Users',x=>({id:String(x[0]),username:String(x[1]),name:String(x[4]),role:String(x[5]),status:String(x[6]||'Active')}))});}
function createUser_(p,session){const username=clean_(p.username,80),password=String(p.password||''),name=clean_(p.name,80),role=String(p.role||'Support');if(!username||password.length<10||!name||roleRank_(role)<10||roleRank_(role)>roleRank_(session.role))return J({ok:false,message:'Invalid user data — password needs 10+ characters and role cannot exceed your own.'});const s=S('Users');if(!s)return J({ok:false,message:'Users sheet missing'});const salt=Utilities.getUuid(),id=Utilities.getUuid();s.appendRow([id,username,salt,hash_(password,salt),name,role,'Active',now_()]);audit_('user_create',username);return J({ok:true,id});}
function updateUser_(p,session){const s=S('Users');if(!s)return J({ok:false,message:'Users sheet missing'});const id=clean_(p.id,120),r=s.getDataRange().getValues();for(let i=1;i<r.length;i++)if(String(r[i][0])===id){if(p.role&&roleRank_(p.role)>roleRank_(session.role))return forbidden_();if(p.status)s.getRange(i+1,7).setValue(p.status);if(p.name)s.getRange(i+1,5).setValue(clean_(p.name,80));if(p.role)s.getRange(i+1,6).setValue(p.role);audit_('user_update',id);return J({ok:true});}return J({ok:false,message:'User not found'});}
function backupCreate_(session){const folder=DriveApp.getFolderById(P('PMT_BACKUP_FOLDER_ID')),data={version:'6.0',createdAt:new Date().toISOString(),sheets:{}};DB().getSheets().forEach(sh=>data.sheets[sh.getName()]=sh.getDataRange().getValues());const body=JSON.stringify(data),checksum=sha_(body),file=folder.createFile('PMT-backup-'+Utilities.formatDate(now_(),Session.getScriptTimeZone(),'yyyyMMdd-HHmmss')+'.json',JSON.stringify({checksum,payload:data}),'application/json');audit_('backup_create',file.getId());return J({ok:true,id:file.getId(),name:file.getName(),checksum});}
function restoreBackup_(id,session){const folder=DriveApp.getFolderById(P('PMT_BACKUP_FOLDER_ID'));let file=null;if(id){const files=folder.getFiles();while(files.hasNext()){const f=files.next();if(f.getId()===id){file=f;break;}}}else{const files=folder.getFilesByType('application/json');let latest=null;while(files.hasNext()){const f=files.next();if(!latest||f.getDateCreated()>latest.getDateCreated())latest=f;}file=latest;}if(!file)return J({ok:false,message:'Backup not found'});const obj=JSON.parse(file.getBlob().getDataAsString());if(!obj.checksum||sha_(JSON.stringify(obj.payload))!==obj.checksum)return J({ok:false,message:'Backup integrity check failed'});backupCreate_(session);const ss=DB(),payload=obj.payload.sheets||{};Object.keys(payload).forEach(name=>{const sh=ss.getSheetByName(name);if(!sh)return;const values=payload[name];sh.clearContents();if(values.length&&values[0].length)sh.getRange(1,1,values.length,values[0].length).setValues(values);});clearCache_();audit_('backup_restore',file.getId());return J({ok:true,message:'Backup restored'});}

/* ---------- Auth ---------- */
function login_(username,password){
  if(!username||!password||password.length<10)return J({ok:false,message:'Invalid credentials'});
  const cache=CacheService.getScriptCache(),key='login_fail_'+Utilities.base64EncodeWebSafe(username).slice(0,80);let attempts=Number(cache.get(key)||0);
  if(attempts>=CFG.MAX_LOGIN_ATTEMPTS)return J({ok:false,message:'Too many attempts. Try again later.'});
  const s=S('Users');if(!s)return J({ok:false,message:'Users sheet is not configured'});const r=s.getDataRange().getValues();let user=null,row=0;
  for(let i=1;i<r.length;i++)if(String(r[i][1]).toLowerCase()===username.toLowerCase()){user=r[i];row=i+1;break;}
  if(!user||String(user[6]||'Active')!=='Active'||hash_(password,user[2])!==String(user[3])){cache.put(key,String(attempts+1),CFG.LOGIN_WINDOW_SECONDS);return J({ok:false,message:'Invalid credentials'});}
  cache.remove(key);const t=token_();cache.put('session_'+t,JSON.stringify({userId:String(user[0]),username:String(user[1]),name:String(user[4]),role:String(user[5]),row:row}),CFG.SESSION_SECONDS);audit_('login',String(user[1]));
  return J({ok:true,token:t,user:{name:String(user[4]),username:String(user[1]),role:String(user[5])},expiresIn:CFG.SESSION_SECONDS});
}
function track_(id){const s=S('Repairs');if(!s)return J({ok:false,status:'Unavailable'});const r=s.getDataRange().getValues();for(let i=1;i<r.length;i++)if(String(r[i][0])===id)return J({ok:true,status:String(r[i][7]||'Pending'),updated:String(r[i][9]||r[i][1]||'')});return J({ok:false,status:'Not found'});}
function notification_(type,message,phone,orderId,actionToken){
  let text=clean_(message,500);
  if(type==='order_received'&&orderId&&actionToken){
    const webAppUrl=ScriptApp.getService().getUrl();
    if(webAppUrl){
      text+="\n\nAccept:\n"+webAppUrl+"?action=acceptOrder&id="+encodeURIComponent(orderId)+"&token="+encodeURIComponent(actionToken);
      text+="\n\nReject:\n"+webAppUrl+"?action=rejectOrder&id="+encodeURIComponent(orderId)+"&token="+encodeURIComponent(actionToken);
    }
  }
  text=clean_(text,500);
  const s=S('Notifications');if(s)s.appendRow([now_(),type,text,false]);
  const email=P('PMT_ALERT_EMAIL');
  if(email&&email_(email)){try{MailApp.sendEmail({to:email,subject:'PMT: '+type,textBody:text});}catch(e){auditSafe_('email_error',String(e));}}
  if(phone)sendWhatsApp_(phone,text);
}
function sendWhatsApp_(phone,message){const url=P('PMT_WA_WEBHOOK_URL');if(!url||!phone_(String(phone)))return;try{UrlFetchApp.fetch(url,{method:'post',contentType:'application/json',payload:JSON.stringify({phone:String(phone),message:clean_(message,500)}),muteHttpExceptions:true});}catch(e){auditSafe_('whatsapp_error',String(e));}}

/* ---------- Single router — the ONLY doGet/doPost in the whole project ---------- */
function doGet(e){
  const a=clean_(e&&e.parameter?e.parameter.action:'',60),p=e&&e.parameter?e.parameter:{};
  try{
    if(a==='acceptOrder')return processOrderAction_(p,'accept');
    if(a==='rejectOrder')return processOrderAction_(p,'reject');
    if(a==='content')return content_();
    if(a==='track')return track_(clean_(p.ticket,40));
    if(a==='publicProducts')return publicProducts_();
    if(a==='publicCoupons')return publicCoupons_();
    if(a==='dashboard')return dashboard_();

    const session=auth_(clean_(p.token,160));
    if(a==='monthlyReport')return session&&roleAllowed_(session,'Support')?monthlyReport_(p.month):forbidden_();
    if(a==='inventory'||a==='lowStock')return session&&roleAllowed_(session,'Support')?inventory_():forbidden_();
    if(a==='orderDetail')return session&&roleAllowed_(session,'Support')?orderDetail_(clean_(p.id,120)):forbidden_();
    if(a==='customerDetail')return session&&roleAllowed_(session,'Support')?customerDetail_(clean_(p.id,120)):forbidden_();
    if(!session)return forbidden_();

    const minimum={analytics:'Support',homepage:'Editor',products:'Manager',orders:'Support',repairs:'Support',coupons:'Manager',reviews:'Manager',notifications:'Support',users:'Owner',feedback:'Support',activity:'Owner',customers:'Support'}[a];
    if(minimum&&!roleAllowed_(session,minimum))return forbidden_();

    if(a==='products')return adminProducts_();
    if(a==='orders')return ordersAdmin_();
    if(a==='customers')return customers_();
    if(a==='homepage')return J({ok:true,data:moduleData_('HomepageBlocks',x=>({id:String(x[0]),type:String(x[1]),title:String(x[2]),enabled:x[3]!==false,position:Number(x[4]||0)})).sort((a,b)=>a.position-b.position)});
    if(a==='repairs')return J({ok:true,data:moduleData_('Repairs',x=>({id:String(x[0]),date:String(x[1]),name:String(x[2]),phoneMasked:maskPhone_(String(x[3]||'')),phone:String(x[3]||''),device:String(x[4]),issue:String(x[5]),notes:String(x[6]),status:String(x[7]||'Pending'),estimate:Number(x[8]||0)}))});
    if(a==='analytics')return analytics_();
    if(a==='coupons')return coupons_();
    if(a==='reviews')return reviews_();
    if(a==='notifications')return notifications_();
    if(a==='users')return users_();
    if(a==='feedback')return feedback_();
    if(a==='activity')return activity_();
    return J({ok:true,service:'PMT Owner API',version:'6.0-consolidated'});
  }catch(err){auditSafe_('get_error',String(err&&err.message||err));return J({ok:false,error:String(err&&err.message||err),message:'Server error'});}
}
function doPost(e){
  let b={};try{b=JSON.parse((e.postData&&e.postData.contents)||'{}');}catch(err){return J({ok:false,error:'Invalid request',code:'INVALID_JSON'});}
  const a=clean_(b.action,60);
  try{
    if(a==='adminLogin')return login_(clean_(b.username,80),String(b.password||''));
    if(a==='createRepair')return createRepair_(b.payload||{});
    if(a==='createFeedback')return createFeedback_(b.payload||{});
    if(a==='createOrder')return createOrder_(b.payload||{});
    if(a==='analyticsEvent'){analyticsEvent_(b);return J({ok:true,data:{}});}

    const session=auth_(b.token);if(!session)return J({ok:false,error:'Unauthorized',code:'UNAUTHORIZED'});
    if(a==='logout')return logout_(b.token);
    if(a==='saveContent')return requireRole_(session,'Editor')?saveContent_(b.content||{},session):forbidden_();
    if(a==='updateHomepage')return requireRole_(session,'Editor')?updateHomepageBlock_(b.payload||{},session):forbidden_();
    if(a==='uploadImage')return requireRole_(session,'Editor')?uploadImage_(b,session):forbidden_();
    if(a==='createBackup')return requireRole_(session,'Owner')?backupCreate_(session):forbidden_();
    if(a==='restoreBackup')return requireRole_(session,'Owner')?restoreBackup_(clean_(b.snapshotId,120),session):forbidden_();
    if(a==='createUser')return requireRole_(session,'Owner')?createUser_(b.payload||{},session):forbidden_();
    if(a==='updateUser')return requireRole_(session,'Owner')?updateUser_(b.payload||{},session):forbidden_();
    if(a==='createProduct')return requireRole_(session,'Manager')?createProduct_(b.payload||{},session):forbidden_();
    if(a==='updateProduct')return requireRole_(session,'Manager')?updateProduct_(b.payload||{},session):forbidden_();
    if(a==='deleteProduct')return requireRole_(session,'Manager')?deleteProduct_(b.payload||{},session):forbidden_();
    if(a==='createCoupon')return requireRole_(session,'Manager')?createCoupon_(b.payload||{},session):forbidden_();
    if(a==='updateCoupon')return requireRole_(session,'Manager')?updateCoupon_(b.payload||{},session):forbidden_();
    if(a==='updateOrder')return requireRole_(session,'Manager')?updateOrder_(b.payload||{},session):forbidden_();
    if(a==='updateRepair')return requireRole_(session,'Support')?updateRepair_(b.payload||{},session):forbidden_();
    if(a==='updateReview')return requireRole_(session,'Manager')?updateReview_(b.payload||{},session):forbidden_();
    return J({ok:false,error:'Unknown action',code:'UNKNOWN_ACTION'});
  }catch(err){auditSafe_('post_error',String(err&&err.message||err));return J({ok:false,error:String(err&&err.message||err),message:'Server error'});}
}

/* ---------- Setup / triggers (unchanged) ---------- */
function setupPMT(spreadsheetId,mediaFolderId,backupFolderId,adminUsername,adminPassword,adminName){
  const props=PropertiesService.getScriptProperties();
  if(spreadsheetId)props.setProperty("PMT_SPREADSHEET_ID",String(spreadsheetId));
  if(mediaFolderId)props.setProperty("PMT_MEDIA_FOLDER_ID",String(mediaFolderId));
  if(backupFolderId)props.setProperty("PMT_BACKUP_FOLDER_ID",String(backupFolderId));
  if(adminUsername)props.setProperty("PMT_OWNER_USERNAME",String(adminUsername));
  if(adminPassword)props.setProperty("PMT_OWNER_PASSWORD",String(adminPassword));
  if(adminName)props.setProperty("PMT_OWNER_NAME",String(adminName));
  const pp=props.getProperties(),id=pp.PMT_SPREADSHEET_ID,mf=pp.PMT_MEDIA_FOLDER_ID,bf=pp.PMT_BACKUP_FOLDER_ID,u=pp.PMT_OWNER_USERNAME,pw=pp.PMT_OWNER_PASSWORD,n=pp.PMT_OWNER_NAME||"Owner";
  if(!id||!mf||!bf||!u||!pw||pw.length<10)throw Error("Missing setup values.");
  const ss=SpreadsheetApp.openById(id);
  const defs={SiteContent:[["key","json"]],HomepageBlocks:[["id","type","title","enabled","position"]],Products:[PRODUCT_HEADERS],Orders:[ORDER_HEADERS],Repairs:[["id","date","name","phone","device","issue","notes","status","estimate","updated"]],Coupons:[["id","code","type","value","expires","active"]],Customers:[["id","name","phone","orders","lastActivity"]],Reviews:[["id","name","text","status","featured"]],Feedback:[["id","date","name","phone","rating","message","status"]],Notifications:[["time","type","message","read"]],Users:[["id","username","salt","hash","name","role","status","created"]],Analytics:[["time","event","path","meta"]],ActivityLog:[["time","action","detail"]]};
  Object.keys(defs).forEach(name=>{let sh=ss.getSheetByName(name);if(!sh)sh=ss.insertSheet(name);const headers=defs[name][0];if(sh.getLastRow()===0)sh.getRange(1,1,1,headers.length).setValues([headers]);else if(sh.getLastColumn()<headers.length)sh.getRange(1,1,1,headers.length).setValues([headers]);});
  ensureProductSchema_(ss.getSheetByName("Products"));
  ensureOrderSchema_(ss.getSheetByName("Orders"));
  const sh=ss.getSheetByName("Users"),rows=sh.getDataRange().getValues();let found=-1;
  for(let i=1;i<rows.length;i++)if(String(rows[i][1]).toLowerCase()===u.toLowerCase()){found=i+1;break;}
  const salt=Utilities.getUuid(),h=hash_(pw,salt);
  if(found<0)sh.appendRow([Utilities.getUuid(),u,salt,h,n,"Owner","Active",now_()]);
  else sh.getRange(found,3,1,6).setValues([[salt,h,n,"Owner","Active",now_()]]);
  props.deleteProperty("PMT_OWNER_PASSWORD");auditSafe_("setup","PMT setup complete");
  return "PMT setup complete.";
}
function installProductionTriggers(){ScriptApp.getProjectTriggers().forEach(t=>ScriptApp.deleteTrigger(t));ScriptApp.newTrigger("scheduledBackup_").timeBased().everyDays(1).atHour(2).create();ScriptApp.newTrigger("lowStockCheck_").timeBased().everyHours(6).create();return "Production triggers installed.";}
function scheduledBackup_(){try{backupCreate_({username:"trigger"});}catch(e){auditSafe_("scheduled_backup_error",String(e));}}
function lowStockCheck_(){try{const low=productRows_().filter(x=>x.status!=='Archived'&&x.stock<=x.minimum);if(low.length)notification_("low_stock",low.map(x=>x.name+" ("+x.stock+")").join(", "));}catch(e){auditSafe_("low_stock_error",String(e));}}
