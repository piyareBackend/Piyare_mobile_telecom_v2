/**
 * PMT granular staff permissions.
 * Explicit permissions are the source of truth for every non-owner account.
 * Role is an identity/management level, not an automatic page-access bundle.
 */
function pmtParsePermissions_(value,role){
  if(String(role)==='Owner')return ['*'];
  var a=[];
  if(Array.isArray(value))a=value;
  else{
    var raw=String(value==null?'':value).trim();
    if(!raw)return [];
    try{a=JSON.parse(raw);}catch(e){return [];}
  }
  if(!Array.isArray(a))return [];
  var catalog=Object.keys(PMT_PERMISSION_CATALOG);
  return a.map(String).filter(function(x,i,self){return catalog.indexOf(x)>=0&&self.indexOf(x)===i;});
}
function pmtRolePermissions_(role){
  if(String(role)==='Owner')return Object.keys(PMT_PERMISSION_CATALOG);
  return Object.keys(PMT_PERMISSION_CATALOG);
}
