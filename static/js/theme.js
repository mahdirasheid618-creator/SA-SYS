(function(){
  const KEY = 'theme'; 
  function applyTheme(theme){
    try{
      if(!theme) theme = 'light';
      document.documentElement.setAttribute('data-theme', theme);
    }catch(e){}
  }
  function setTheme(theme){
    if(!theme) theme = 'light';
    localStorage.setItem(KEY, theme);
    applyTheme(theme);
  }
  function init(){
    const saved = localStorage.getItem(KEY) || 'light';
    applyTheme(saved);
    window.setTheme = setTheme;
    window.getTheme = function(){ return localStorage.getItem(KEY) || 'light'; };
    window.addEventListener('storage', function(e){
      if(e.key === KEY){
        applyTheme(e.newValue || 'light');
      }
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
