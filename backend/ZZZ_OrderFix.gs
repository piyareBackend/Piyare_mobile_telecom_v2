/* PMT final order/inventory synchronization fix. Load after all existing backend files. */
function pmtOrderEnsureOrdersSchema_(){
  const s=S('Orders');
  if(!s)return null;
  if(s.getLastColumn()<9)s.insertColumnAfter(Math.max(1,s.getLastColumn()));
  const h=s.getRange(1,1,1,Math.max(9,s.getLastColumn())).getValues()[0];
  if(!h[8])s.getRange(1,9).setValue('actionToken');
  return s;
}
function pmtOrderCreateFixed_(p){
  p=p||{};
  const name=clean_(p.name,80),ph=clean_(p.phone,10),items=Array.isArray(p.items)?p.items:[];
  if(!name||!phone_(ph)||!items.length)return J({ok:false,message:'Name, valid phone and at least one item are required'});
  if(!publicRate_('order',ph))return J({ok:false,message:'Please wait before submitting another order.'});
  const ps=S('Products'),os=pmtOrderEnsureOrdersSchema_();
  if(!ps||!os)return J({ok:false,message:'Service unavailable'});
  const lock=LockService.getScriptLock();let locked=false;
  try{
    lock.waitLock(10000);locked=true;
    const rows=ps.getDataRange().getValues(),map={};
    for(let i=1;i<rows.length;i++){
      const x=pmtProductMap_(rows[i]);
      if(x.status==='Archived'||x.deletedAt)continue;
      map[x.id]={row:i+1,p:x};
    }
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
      if(cs){const cr=cs.getDataRange().getValues();for(let i=1;i<cr.length;i++)if(String(cr[i][1]).toUpperCase()===coupon.toUpperCase()&&cr[i][5]!==false){const exp=cr[i][4]?new Date(cr[i][4]):null;if(!exp||isNaN(exp.getTime())||exp>=new Date()){const type=String(cr[i][2]||'percent'),val=Number(cr[i][3]||0);discount=type.toLowerCase()==='flat'?Math.min(val,total):Math.min(Math.round(total*val/100),total);}break;}}}
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
    if(typeof pmtPatchClear_==='function')pmtPatchClear_();
    auditSafe_('order_create',id);
    return J({ok:true,id,total:finalTotal,discount,message:'Order received'});
  }catch(err){auditSafe_('order_create_error',String(err&&err.message||err));return J({ok:false,message:'Server error'});}
  finally{if(locked)lock.releaseLock();}
}
function pmtOrderActionFixed_(p,action){
  const id=clean_(p&&p.id,120),provided=clean_(p&&p.token,200);
  if(!id||!provided)return orderActionPage_('Invalid order link','The order link is missing required information.');
  const os=pmtOrderEnsureOrdersSchema_(),ps=S('Products');
  if(!os||!ps)return orderActionPage_('Service unavailable','Please try again later.');
  const lock=LockService.getScriptLock();let locked=false;
  try{
    lock.waitLock(10000);locked=true;
    const rows=os.getDataRange().getValues();let rowIndex=-1,row=null;
    for(let i=1;i<rows.length;i++)if(String(rows[i][0])===id){rowIndex=i+1;row=rows[i];break;}
    if(rowIndex<0)return orderActionPage_('Order not found','This order could not be found.');
    const status=String(row[7]||'Pending'),stored=String(row[8]||'');
    if(status!=='Pending')return orderActionPage_('This order was already processed','Current status: '+status);
    if(!stored||stored!==provided)return orderActionPage_('Invalid order link','This order link is invalid or has expired.');
    if(action==='accept'){
      os.getRange(rowIndex,8).setValue('Confirmed');
      os.getRange(rowIndex,9).setValue('');
      if(typeof pmtPatchClear_==='function')pmtPatchClear_();
      auditSafe_('order_accept',id);
      return orderActionPage_('Order Accepted','Order '+id+' has been confirmed.');
    }
    if(action!=='reject')return orderActionPage_('Invalid action','This order link contains an invalid action.');
    let items=[];try{items=JSON.parse(String(row[4]||'[]'));}catch(e){return orderActionPage_('Order data error','The order could not be safely processed.');}
    const productRows=ps.getDataRange().getValues(),map={};
    for(let i=1;i<productRows.length;i++){const x=pmtProductMap_(productRows[i]);map[x.id]={row:i+1,p:x};}
    const restore={};
    for(const item of items){
      const pid=String(item&&item.id||''),x=map[pid],qty=Math.max(1,Math.min(99,Number(item&&item.qty)||1));
      if(!x)return orderActionPage_('Product unavailable','The order could not be rejected safely because a product record is missing.');
      if(item&&item.variantId){
        const key=pid+'::'+String(item.variantId);restore[key]=(restore[key]||0)+qty;
      }else restore[pid]=(restore[pid]||0)+qty;
    }
    Object.keys(restore).forEach(key=>{
      const parts=key.split('::'),pid=parts[0],variantId=parts.length>1?parts.slice(1).join('::'):'';
      const x=map[pid];
      if(variantId){
        const arr=Array.isArray(x.p.variants)?x.p.variants.map(v=>String(v.id)===variantId?Object.assign({},v,{stock:Number(v.stock||0)+restore[key]}):v):null;
        if(!arr)return;
        ps.getRange(x.row,12).setValue(JSON.stringify(arr));
      }else ps.getRange(x.row,5).setValue(Number(x.p.stock||0)+restore[key]);
      ps.getRange(x.row,7).setValue(now_());
    });
    os.getRange(rowIndex,8).setValue('Rejected');
    os.getRange(rowIndex,9).setValue('');
    if(typeof pmtPatchClear_==='function')pmtPatchClear_();
    auditSafe_('order_reject',id);
    return orderActionPage_('Order Rejected','Order '+id+' has been rejected and stock has been restored.');
  }catch(err){auditSafe_('order_action_error',String(err&&err.message||err));return orderActionPage_('Server error','The order could not be processed. Please try again.');}
  finally{if(locked)lock.releaseLock();}
}
function pmtOrderDashboardFixed_(){
  const orders=pmtOrderFreshOrders_(),products=pmtProductRows_(),repairs=moduleData_('Repairs',x=>({id:String(x[0])})),feedback=S('Feedback')?Math.max(0,S('Feedback').getLastRow()-1):0;
  const revenue=orders.filter(x=>x.status==='Confirmed').reduce((n,x)=>n+Number(x.total||0),0);
  const active=products.filter(x=>x.status!=='Archived'&&!x.deletedAt);
  const low=active.filter(x=>x.stock>0&&x.stock<=x.minimum);
  const out=active.filter(x=>x.stock<=0);
  return J({ok:true,visitors:0,orders:orders.length,repairs:repairs.length,revenue,feedback,productCount:active.length,lowStock:low.length,outOfStock:out.length,alerts:low.slice(0,10).map(x=>x.name+' is low: '+x.stock+' left')});
}
function pmtOrderFreshOrders_(){
  const s=pmtOrderEnsureOrdersSchema_();if(!s)return [];
  const r=s.getDataRange().getValues();
  return r.length>1?r.slice(1).map(pmtPatchOrder_).reverse():[];
}
function pmtOrderMonthlyFixed_(month){
  const key=String(month||'').match(/^\d{4}-\d{2}$/)?String(month):Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM');
  const start=new Date(key+'-01T00:00:00'),end=new Date(start);end.setMonth(end.getMonth()+1);
  const inRange=v=>{const d=new Date(v);return !isNaN(d.getTime())&&d>=start&&d<end;};
  const orders=pmtOrderFreshOrders_().filter(x=>inRange(x.date));
  const repairs=moduleData_('Repairs',x=>({id:String(x[0]),date:String(x[1]),name:String(x[2]),device:String(x[4]),issue:String(x[5]),status:String(x[7]||'Pending'),estimate:Number(x[8]||0)})).filter(x=>inRange(x.date));
  return J({ok:true,month:key,summary:{orders:orders.length,repairs:repairs.length,revenue:orders.filter(x=>x.status==='Confirmed').reduce((n,x)=>n+Number(x.total||0),0)},orders,repairs});
}
function pmtOrderInventoryFixed_(){
  const items=pmtProductRows_().filter(x=>x.status!=='Archived'&&!x.deletedAt);
  return J({ok:true,totalProducts:items.length,totalVariants:items.reduce((n,x)=>n+(Array.isArray(x.variants)&&x.variants.length?x.variants.length:1),0),lowStock:items.filter(x=>x.stock>0&&x.stock<=x.minimum),outOfStock:items.filter(x=>x.stock<=0)});
}
function doGet(e){
  const a=clean_(e&&e.parameter?e.parameter.action:'',60),p=e&&e.parameter?e.parameter:{};
  if(a==='acceptOrder')return pmtOrderActionFixed_(p,'accept');
  if(a==='rejectOrder')return pmtOrderActionFixed_(p,'reject');
  if(a==='dashboard')return pmtOrderDashboardFixed_();
  if(a==='monthlyReport'){
    const session=auth_(clean_(p.token,160));
    return session&&roleAllowed_(session,'Support')?pmtOrderMonthlyFixed_(p.month):forbidden_();
  }
  if(a==='inventory'||a==='lowStock'){
    const session=auth_(clean_(p.token,160));
    return session&&roleAllowed_(session,'Support')?pmtOrderInventoryFixed_():forbidden_();
  }
  if(a==='orders'){
    const session=auth_(clean_(p.token,160));
    return session&&roleAllowed_(session,'Support')?J({ok:true,items:pmtOrderFreshOrders_()}):forbidden_();
  }
  return pmtPatchDoGet(e);
}
function doPost(e){
  let b={};try{b=JSON.parse((e.postData&&e.postData.contents)||'{}');}catch(err){return J({ok:false,error:'Invalid request',code:'INVALID_JSON'});}
  if(clean_(b.action,60)==='createOrder')return pmtOrderCreateFixed_(b.payload||{});
  return pmtPatchDoPost(e);
}
