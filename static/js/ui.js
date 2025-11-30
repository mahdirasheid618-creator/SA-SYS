
const UI = (function(){
  function showToast(message, type='info', timeout=3000){
    const toast = Helpers.el('div','toast'); toast.textContent = message; toast.classList.add(type);
    toast.style.position='fixed'; toast.style.bottom='20px'; toast.style.left='20px'; toast.style.padding='10px 14px'; toast.style.borderRadius='8px'; toast.style.background='rgba(0,0,0,0.8)'; toast.style.color='#fff'; toast.style.zIndex=9999; document.body.appendChild(toast);
    setTimeout(()=>{ toast.style.transition='opacity 220ms'; toast.style.opacity=0; setTimeout(()=>toast.remove(),240); }, timeout);
  }
  function confirmDialog(message){ return new Promise((resolve)=>{ if(window.confirm(message)) resolve(true); else resolve(false); }); }
  function toggleSidebar(){ const sb = Helpers.qs('.sidebar'); if(!sb) return; sb.classList.toggle('open'); }
  return { showToast, confirmDialog, toggleSidebar };
})();
