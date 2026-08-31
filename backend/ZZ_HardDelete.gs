/* PMT hard-delete override. Keep Drive media untouched; remove only the selected product row. */
function pmtPatchDeleteProduct_(p,session){
  const s=S('Products');
  if(!s)return J({ok:false,message:'Products sheet missing'});
  if(!session||!roleAllowed_(session,'Manager'))return forbidden_();
  const id=clean_(p&&p.id,120);
  if(!id)return J({ok:false,message:'Product id is required'});
  const values=s.getDataRange().getValues();
  for(let i=values.length-1;i>=1;i--){
    if(String(values[i][0])===id){
      s.deleteRow(i+1);
      pmtPatchClear_();
      audit_('product_delete',id);
      return J({ok:true,id,deleted:true,message:'Product permanently deleted'});
    }
  }
  return J({ok:false,message:'Product not found'});
}
