
const Forms = (function(){
  function serialize(form){ const obj = {}; new FormData(form).forEach((v,k)=>{ if(obj[k]){ if(Array.isArray(obj[k])) obj[k].push(v); else obj[k]=[obj[k],v]; } else obj[k]=v; }); return obj; }
  function clearForm(form){ form.reset(); }
  function validateRequired(form){ const req = form.querySelectorAll('[required]'); for(const el of req){ if(!el.value || el.value.trim()===''){ el.focus(); return { ok:false, field:el }; } } return { ok:true }; }
  return { serialize, clearForm, validateRequired };
})();
