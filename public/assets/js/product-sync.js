/* PMT product source-of-truth client. Admin pages use the same Products endpoint as the product editor. */
(function(){
  'use strict';
  const CACHE_KEY='pmt-admin-products-last-good-v2';
  function normalize(d){
    const raw=Array.isArray(d)?d:(Array.isArray(d?.items)?d.items:Array.isArray(d?.products)?d.products:Array.isArray(d?.data)?d.data:Array.isArray(d?.data?.products)?d.data.products:[]);
    return raw.filter(Boolean).map((x,i)=>({...x,id:String(x.id??x.ID??x.productId??('product-'+i)),name:String(x.name??x.title??''),sku:String(x.sku??''),price:Number(x.price??0),stock:Number(x.stock??0),minimum:Number(x.minimum??0),status:String(x.status??'Active'),deletedAt:String(x.deletedAt??''),variants:Array.isArray(x.variants)?x.variants:[],images:Array.isArray(x.images)?x.images.filter(Boolean):x.image?[x.image]:[]})).filter(x=>x.name);
  }
  function readLocal(){
    try{
      const c=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
      if(Array.isArray(c?.items))return c;
    }catch(_){}
    return null;
  }
  function saveLocal(items){try{localStorage.setItem(CACHE_KEY,JSON.stringify({ts:Date.now(),items}));}catch(_){} }
  function errorMessage(err){return String(err?.message||err?.error?.message||err?.error||err||'Product API failed');}
  async function fetchProducts(){
    if(typeof window.pmtOfflineGet==='function') return window.pmtOfflineGet('products');
    if(typeof window.pmtGet==='function') return window.pmtGet('products');
    throw new Error('Central API client is not loaded');
  }
  window.pmtLoadAdminProducts=async function(){
    try{
      const d=await fetchProducts();
      if(d?.ok===false)throw new Error(d?.error?.message||d?.error||d?.message||d?.code||'Product API rejected the request');
      const items=normalize(d);
      if(!items.length && Array.isArray(d?.items)===false && Array.isArray(d?.products)===false && Array.isArray(d?.data)===false && !Array.isArray(d)) throw new Error('Product API returned an unexpected response shape');
      saveLocal(items);
      window.dispatchEvent(new CustomEvent('pmt-products-updated',{detail:{source:'server',count:items.length,updatedAt:Date.now()}}));
      return items;
    }catch(err){
      const local=readLocal();
      if(local){
        window.dispatchEvent(new CustomEvent('pmt-offline-cache-used',{detail:{action:'products',updatedAt:local.ts,count:local.items.length,error:errorMessage(err)}}));
        return local.items;
      }
      throw new Error(errorMessage(err));
    }
  };
  window.pmtGetAdminProductsLastGood=function(){return readLocal();};
  window.pmtInvalidateProductCaches=function(){
    try{
      Object.keys(sessionStorage).filter(k=>k.startsWith('pmt-admin-cache:products:')||k.startsWith('pmt-admin-cache:dashboard:')).forEach(k=>sessionStorage.removeItem(k));
      ['pmt-public-products-cache-v2','pmt-public-products-cache-v3'].forEach(k=>localStorage.removeItem(k));
    }catch(_){}
  };
})();
