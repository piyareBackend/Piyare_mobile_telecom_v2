/* PMT staff permission editor: every catalog permission is explicitly assignable. */
(function(){
  if(!/\/admin\/staff-access(?:\.html)?$/i.test(location.pathname))return;
  function enableAll(){
    document.querySelectorAll('#permissions input[type="checkbox"]').forEach(function(input){
      input.disabled=false;
      var label=input.closest('label');
      if(label)label.style.opacity='1';
    });
  }
  function boot(){
    enableAll();
    var root=document.getElementById('permissions');
    if(root)new MutationObserver(enableAll).observe(root,{childList:true,subtree:true});
    var role=document.getElementById('role');
    if(role)role.addEventListener('change',function(){setTimeout(enableAll,0)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
