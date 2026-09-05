/* PMT POS Billing V2
 * Extends the existing POS endpoint without changing website checkout.
 * Supports catalog products, shop-only custom items, and repair bills.
 * Keep this file after Code.gs in the Apps Script project so its POS entrypoint is used.
 */
const PMT_POS_BILLING_V2_HEADERS=['billType','billSource','repairTicket','notes'];

function ensurePosBillingV2Schema_(){
  const s=S('Orders');
  if(!s)throw Error('Orders sheet missing');
  ensurePosOrderSchema_();
  const start=ORDER_HEADERS.length+PMT_POS_ORDER_EXTRA_HEADERS.length+1;
  const last=Math.max(s.getLastColumn(),start+PMT_POS_BILLING_V2_HEADERS.length-1);
  const h=s.getRange(1,1,1,last).getValues()[0];
  let changed=false;
  PMT_POS_BILLING_V2_HEADERS.forEach((name,i)=>{if(!h[start-1+i]){h[start-1+i]=name;changed=true;}});
  if(changed)s.getRange(1,1,1,last).setValues([h]);
  return s;
}

function pmtPosBillingV2NormalizeItems_(items){
  if(!Array.isArray(items)||!items.length)throw Error('At least one item is required');
  const catalog=items.filter(x=>String(x&&x.kind||'product')==='product');
  const nonCatalog=items.filter(x=>['custom','service','repair'].indexOf(String(x&&x.kind||''))>=0);
  const reserved=catalog.length?reserveStockAtomic_(catalog):[];
  const out=reserved.map(x=>Object.assign({},x,{kind:'product'}));
  nonCatalog.forEach(raw=>{
    const kind=String(raw&&raw.kind||'');
    const name=clean_(raw&&raw.name,160);
    const qty=Math.floor(Number(raw&&raw.qty)||0);
    const price=Number(raw&&raw.price);
    if(!name||qty<1||!isFinite(price)||price<0)throw Error('Invalid custom/repair line');
    const prefix=kind==='custom'?'CUSTOM-':kind==='service'?'SERVICE-':'REPAIR-';
    out.push({id:prefix+Utilities.getUuid().slice(0,10).toUpperCase(),name,qty,price,variantId:'',kind,sku:clean_(raw&&raw.sku,80),notes:clean_(raw&&raw.notes,500)});
  });
  if(!out.length)throw Error('At least one item is required');
  return out;
}

function createPosBill_(p,session){
  if(!roleAllowed_(session,'Support'))return forbidden_();
  p=p||{};
  const key=clean_(p.idempotencyKey,160);
  if(!key)return J({ok:false,error:'idempotencyKey is required',code:'IDEMPOTENCY_KEY_REQUIRED'});
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(25000))return J({ok:false,error:'Busy; please retry',code:'SERVER_BUSY'});
  let stockReserved=[];
  try{
    const idem=ensureIdempotencySheet_();
    const existing=findIdempotency_(idem,key);
    if(existing)return J(existing);
    const name=clean_(p.name||'Walk-in',80)||'Walk-in';
    const phone=clean_(p.phone||'',10);
    if(phone&&!phone_(phone))return J({ok:false,error:'Invalid phone',code:'PHONE_INVALID'});
    const gstRate=Math.max(0,Math.min(100,Number(p.gstRate)||0));
    const billType=['SALE','CUSTOM','REPAIR'].indexOf(String(p.billType||'SALE').toUpperCase())>=0?String(p.billType||'SALE').toUpperCase():'SALE';
    const lines=pmtPosBillingV2NormalizeItems_(Array.isArray(p.items)?p.items:[]);
    stockReserved=lines.filter(x=>x.kind==='product');
    const subtotal=Math.round(lines.reduce((n,x)=>n+(Number(x.price)||0)*x.qty,0)*100)/100;
    const discount=Math.min(subtotal,Math.max(0,Number(p.discount)||0));
    const taxable=Math.max(0,subtotal-discount);
    const gstAmount=Math.round(taxable*gstRate/100*100)/100;
    const total=Math.round((taxable+gstAmount)*100)/100;
    const payment=normalizePayment_(p.payment,total);
    const os=ensurePosBillingV2Schema_();
    const id='PMT-POS-'+new Date().getFullYear()+'-'+Utilities.getUuid().slice(0,8).toUpperCase();
    const itemsJson=lines.map(x=>({id:x.id,name:x.name,qty:x.qty,price:x.price,variantId:x.variantId||'',kind:x.kind||'product',sku:x.sku||'',notes:x.notes||''}));
    const start=ORDER_HEADERS.length+PMT_POS_ORDER_EXTRA_HEADERS.length;
    const row=[id,now_(),name,phone,JSON.stringify(itemsJson),total,payment.mode,'Confirmed','',subtotal,gstRate,gstAmount,pmtJson_(payment),key,'POS',billType,'SHOP-POS',clean_(p.repairTicket,80),clean_(p.notes,1000)];
    os.appendRow(row);
    if(phone)upsertCustomer_(name,phone);
    clearCache_();
    auditSafe_('pos_bill_create',id+' | '+billType+' | '+key);
    const result={ok:true,id,orderId:id,total,subtotal,discount,gstRate,gstAmount,payment,billType,repairTicket:clean_(p.repairTicket,80),items:itemsJson};
    saveIdempotency_(idem,key,result);
    try{sendOrderConfirmationNotifications_(name,phone,id,total);}catch(e){auditSafe_('notification_error',String(e));}
    return J(result);
  }catch(err){
    if(stockReserved.length){try{restoreStockAtomic_(stockReserved);}catch(e){auditSafe_('stock_rollback_error',String(e));}}
    return J({ok:false,error:String(err&&err.message||err),code:'POS_BILL_FAILED'});
  }finally{lock.releaseLock();}
}
