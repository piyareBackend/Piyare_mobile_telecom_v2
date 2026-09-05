/**
 * PMT Access Control V1
 * Granular staff permissions layered over the existing role system.
 * Keep this file alphabetically after the consolidated router files so its
 * doGet/doPost/login definitions are the active ones in Apps Script.
 */
const PMT_PERMISSION_CATALOG={
  dashboard:'Dashboard',pos:'POS',billing:'Billing',website:'Website Editor',banners:'Banners',
  products_view:'Products — View',products_edit:'Products — Edit',inventory_view:'Inventory — View',inventory_edit:'Inventory — Edit',
  orders_view:'Orders — View',orders_edit:'Orders — Edit',repairs:'Repairs',coupons:'Coupons',customers:'Customers',
  feedback:'Feedback',analytics:'Analytics',reports:'Monthly Reports',media:'Media & Uploads',settings:'Settings',security:'Security',
  staff:'Staff Management',backups:'Backups'
};
const PMT_ROLE_PERMISSIONS={
  Support:['dashboard','pos','billing','orders_view','repairs','customers','inventory_view'],
  Editor:['dashboard','website','banners','products_view','media','feedback'],
  Manager:['dashboard','pos','billing','products_view','products_edit','inventory_view','inventory_edit','orders_view','orders_edit','repairs','coupons','customers','feedback','analytics','reports','media','website','banners'],
  Owner:Object.keys(PMT_PERMISSION_CATALOG)
};
const PMT_ACTION_PERMISSIONS={
  dashboard:'dashboard',analytics:'analytics',homepage:'website',products:'products_view',orders:'orders_view',repairs:'repairs',coupons:'coupons',reviews:'feedback',notifications:'dashboard',users:'staff',feedback:'feedback',activity:'security',customers:'customers',inventory:'inventory_view',lowStock:'inventory_view',monthlyReport:'reports',orderDetail:'orders_view',customerDetail:'customers',
  saveContent:'website',updateHomepage:'website',uploadImage:'media',createBackup:'backups',restoreBackup:'backups',createUser:'staff',updateUser:'staff',updateStaffPermissions:'staff',createProduct:'products_edit',updateProduct:'products_edit',deleteProduct:'products_edit',createCoupon:'coupons',updateCoupon:'coupons',updateOrder:'orders_edit',updateRepair:'repairs',updateReview:'feedback',createPosBill:'billing'
};
function pmtAccessEnsureSchema_(){
  const s=S('Users');if(!s)throw Error('Users sheet missing');
  const col=Math.max(9,s.getLastColumn());
  if(s.getLastColumn()<col)s.insertColumnsAfter(s.getLastColumn()||1,col-s.getLastColumn());
  const h=s.getRange(1,1,1,col).getValues()[0];
  if(!h[8]){h[8]='permissions';s.getRange(1,1,1,col).setValues([h]);}
  return s;
}
function pmtRolePermissions_(role){return (PMT_ROLE_PERMISSIONS[String(role)]||[]).slice();}
function pmtParsePermissions_(value,role){
  if(String(role)==='Owner')return ['*'];
  let a=[];try{a=Array.isArray(value)?value:JSON.parse(String(value||'[]'));}catch(e){a=[];}
  if(!Array.isArray(a)||!a.length)return pmtRolePermissions_(role);
  const ceiling=pmtRolePermissions_(role);return a.map(String).filter(x=>ceiling.indexOf(x)>=0);
}
function pmtPermissionsForUserRow_(row){return pmtParsePermissions_(row&&row[8],String(row&&row[5]||'Support'));}
function pmtHasPermission_(session,permission){
  if(!session)return false;
  if(String(session.role)==='Owner')return true;
  const p=String(permission||'');
  const a=Array.isArray(session.permissions)?session.permissions:pmtRolePermissions_(session.role);
  return a.indexOf(p)>=0;
}
function pmtAccessAllowed_(session,action){const p=PMT_ACTION_PERMISSIONS[String(action||'')];return !p||pmtHasPermission_(session,p);}
function pmtAccessDenied_(){return forbidden_();}
function pmtUserById_(id){
  const s=pmtAccessEnsureSchema_(),r=s.getDataRange().getValues();
  for(let i=1;i<r.length;i++)if(String(r[i][0])===String(id))return {sheet:s,row:i+1,data:r[i]};
  return null;
}
function pmtUsers_(){
  const s=pmtAccessEnsureSchema_(),r=s.getDataRange().getValues();
  return J({ok:true,data:r.length>1?r.slice(1).map(x=>({id:String(x[0]),username:String(x[1]),name:String(x[4]),role:String(x[5]),status:String(x[6]||'Active'),permissions:pmtPermissionsForUserRow_(x),permissionCatalog:PMT_PERMISSION_CATALOG})):[]});
}
function pmtUpdateStaffPermissions_(p,session){
  if(!session||String(session.role)!=='Owner')return forbidden_();
  const found=pmtUserById_(clean_(p&&p.id,120));if(!found)return J({ok:false,message:'User not found'});
  const targetRole=String(found.data[5]||'Support');
  if(targetRole==='Owner')return J({ok:false,message:'Owner permissions are always full access'});
  let requested=Array.isArray(p&&p.permissions)?p.permissions.map(String):[];
  const ceiling=pmtRolePermissions_(targetRole);
  requested=requested.filter((x,i,a)=>ceiling.indexOf(x)>=0&&a.indexOf(x)===i);
  found.sheet.getRange(found.row,9).setValue(JSON.stringify(requested));
  auditSafe_('staff_permissions_update',String(found.data[1])+' | '+JSON.stringify(requested));
  return J({ok:true,data:{id:String(found.data[0]),permissions:requested}});
}
function pmtCreateUser_(p,session){
  const username=clean_(p&&p.username,80),password=String(p&&p.password||''),name=clean_(p&&p.name,80),role=String(p&&p.role||'Support');
  if(!username||password.length<10||!name||roleRank_(role)<10||roleRank_(role)>roleRank_(session.role))return J({ok:false,message:'Invalid user data — password needs 10+ characters and role cannot exceed your own.'});
  const s=pmtAccessEnsureSchema_(),salt=Utilities.getUuid(),id=Utilities.getUuid();
  let perms=Array.isArray(p&&p.permissions)?p.permissions.map(String):[];
  const ceiling=pmtRolePermissions_(role);perms=perms.filter((x,i,a)=>ceiling.indexOf(x)>=0&&a.indexOf(x)===i);
  s.appendRow([id,username,salt,hash_(password,salt),name,role,'Active',now_(),JSON.stringify(perms)]);
  audit_('user_create',username);return J({ok:true,id,permissions:perms});
}
function pmtLogin_(username,password){
  if(!username||!password||password.length<10)return J({ok:false,message:'Invalid credentials'});
  const cache=CacheService.getScriptCache(),key='login_fail_'+Utilities.base64EncodeWebSafe(username).slice(0,80);let attempts=Number(cache.get(key)||0);
  if(attempts>=CFG.MAX_LOGIN_ATTEMPTS)return J({ok:false,message:'Too many attempts. Try again later.'});
  const s=pmtAccessEnsureSchema_(),r=s.getDataRange().getValues();let user=null,row=0;
  for(let i=1;i<r.length;i++)if(String(r[i][1]).toLowerCase()===username.toLowerCase()){user=r[i];row=i+1;break;}
  if(!user||String(user[6]||'Active')!=='Active'||hash_(password,user[2])!==String(user[3])){cache.put(key,String(attempts+1),CFG.LOGIN_WINDOW_SECONDS);return J({ok:false,message:'Invalid credentials'});}
  cache.remove(key);const t=token_(),permissions=pmtPermissionsForUserRow_(user);
  cache.put('session_'+t,JSON.stringify({userId:String(user[0]),username:String(user[1]),name:String(user[4]),role:String(user[5]),permissions,row}),CFG.SESSION_SECONDS);
  audit_('login',String(user[1]));
  return J({ok:true,token:t,user:{name:String(user[4]),username:String(user[1]),role:String(user[5]),permissions},expiresIn:CFG.SESSION_SECONDS});
}
function pmtMyPermissions_(session){
  if(!session)return forbidden_();
  return J({ok:true,user:{id:String(session.userId||''),name:String(session.name||''),username:String(session.username||''),role:String(session.role||''),permissions:String(session.role)==='Owner'?['*']:(session.permissions||pmtRolePermissions_(session.role)),permissionCatalog:PMT_PERMISSION_CATALOG}});
}
function doGet(e){
  const a=clean_(e&&e.parameter?e.parameter.action:'',60),p=e&&e.parameter?e.parameter:{};
  try{
    if(a==='acceptOrder')return processOrderAction_(p,'accept');
    if(a==='rejectOrder')return processOrderAction_(p,'reject');
    if(a==='content')return content_();
    if(a==='track')return track_(clean_(p.ticket,40));
    if(a==='publicProducts')return publicProducts_();
    if(a==='publicCoupons')return publicCoupons_();
    const session=auth_(clean_(p.token,160));
    if(!session)return forbidden_();
    if(a==='myPermissions')return pmtMyPermissions_(session);
    if(a==='dashboard'&&pmtAccessAllowed_(session,a))return dashboard_();
    if(a==='monthlyReport'&&pmtAccessAllowed_(session,a))return monthlyReport_(p.month);
    if((a==='inventory'||a==='lowStock')&&pmtAccessAllowed_(session,a))return inventory_();
    if(a==='orderDetail'&&pmtAccessAllowed_(session,a))return orderDetail_(clean_(p.id,120));
    if(a==='customerDetail'&&pmtAccessAllowed_(session,a))return customerDetail_(clean_(p.id,120));
    if(!pmtAccessAllowed_(session,a))return pmtAccessDenied_();
    if(a==='products')return adminProducts_();
    if(a==='orders')return ordersAdmin_();
    if(a==='customers')return customers_();
    if(a==='homepage')return J({ok:true,data:moduleData_('HomepageBlocks',x=>({id:String(x[0]),type:String(x[1]),title:String(x[2]),enabled:x[3]!==false,position:Number(x[4]||0)})).sort((a,b)=>a.position-b.position)});
    if(a==='repairs')return J({ok:true,data:moduleData_('Repairs',x=>({id:String(x[0]),date:String(x[1]),name:String(x[2]),phoneMasked:maskPhone_(String(x[3]||'')),phone:String(x[3]||''),device:String(x[4]),issue:String(x[5]),notes:String(x[6]),status:String(x[7]||'Pending'),estimate:Number(x[8]||0)}))});
    if(a==='analytics')return analytics_();
    if(a==='coupons')return coupons_();
    if(a==='reviews')return reviews_();
    if(a==='notifications')return notifications_();
    if(a==='users')return pmtUsers_();
    if(a==='feedback')return feedback_();
    if(a==='activity')return activity_();
    return J({ok:true,service:'PMT Owner API',version:'7.0-access-control'});
  }catch(err){auditSafe_('get_error',String(err&&err.message||err));return J({ok:false,error:String(err&&err.message||err),message:'Server error'});}
}
function doPost(e){
  let b={};try{b=JSON.parse((e.postData&&e.postData.contents)||'{}');}catch(err){return J({ok:false,error:'Invalid request',code:'INVALID_JSON'});}
  const a=clean_(b.action,60);
  try{
    if(a==='adminLogin')return pmtLogin_(clean_(b.username,80),String(b.password||''));
    if(a==='createRepair')return createRepair_(b.payload||{});
    if(a==='createFeedback')return createFeedback_(b.payload||{});
    if(a==='createOrder')return createOrder_(b.payload||{});
    if(a==='analyticsEvent'){analyticsEvent_(b);return J({ok:true,data:{}});}
    const session=auth_(b.token);if(!session)return J({ok:false,error:'Unauthorized',code:'UNAUTHORIZED'});
    if(a==='logout')return logout_(b.token);
    if(!pmtAccessAllowed_(session,a))return pmtAccessDenied_();
    if(a==='saveContent')return saveContent_(b.content||{},session);
    if(a==='updateHomepage')return updateHomepageBlock_(b.payload||{},session);
    if(a==='uploadImage')return uploadImage_(b,session);
    if(a==='createBackup')return backupCreate_(session);
    if(a==='restoreBackup')return restoreBackup_(clean_(b.snapshotId,120),session);
    if(a==='createUser')return pmtCreateUser_(b.payload||{},session);
    if(a==='updateUser')return updateUser_(b.payload||{},session);
    if(a==='updateStaffPermissions')return pmtUpdateStaffPermissions_(b.payload||{},session);
    if(a==='createProduct')return createProduct_(b.payload||{},session);
    if(a==='updateProduct')return updateProduct_(b.payload||{},session);
    if(a==='deleteProduct')return deleteProduct_(b.payload||{},session);
    if(a==='createCoupon')return createCoupon_(b.payload||{},session);
    if(a==='updateCoupon')return updateCoupon_(b.payload||{},session);
    if(a==='updateOrder')return updateOrder_(b.payload||{},session);
    if(a==='updateRepair')return updateRepair_(b.payload||{},session);
    if(a==='updateReview')return updateReview_(b.payload||{},session);
    if(a==='createPosBill')return createPosBill_(b.payload||{},session);
    return J({ok:false,error:'Unknown action',code:'UNKNOWN_ACTION'});
  }catch(err){auditSafe_('post_error',String(err&&err.message||err));return J({ok:false,error:String(err&&err.message||err),message:'Server error'});}
}
