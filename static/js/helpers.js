
const Helpers = (function(){
  function qs(sel, root=document){ return root.querySelector(sel); }
  function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
  function el(tag, cls='', attrs={}){
    const e = document.createElement(tag); if(cls) e.className = cls;
    Object.keys(attrs).forEach(k=>e.setAttribute(k, attrs[k])); return e;
  }
  function base64ToBlob(base64, mime='image/jpeg'){ const byteChars = atob(base64.split(',')[1] || base64); const byteNumbers = new Array(byteChars.length); for (let i=0;i<byteChars.length;i++) byteNumbers[i]=byteChars.charCodeAt(i); const byteArray = new Uint8Array(byteNumbers); return new Blob([byteArray], {type:mime}); }
  return { qs, qsa, el, base64ToBlob };
})();
