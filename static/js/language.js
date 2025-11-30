
(function(){
  const STORAGE_KEY = 'language';
  const DEFAULT_LANG = 'ar';
  async function loadLocale(lang){
    try{
      const resp = await fetch('/static/i18n/' + lang + '.json', { cache: 'no-cache' });
      if(!resp.ok) throw new Error('Locale not found: ' + lang);
      return await resp.json();
    }catch(err){
      return {};
    }
  }
  function applyDictionary(dict){
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n');
      if(!key) return;
      const text = dict[key] ?? dict[key.split('.').pop()];
      if(text !== undefined){
        if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = text;
        else el.textContent = text;
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
      const key = el.getAttribute('data-i18n-placeholder');
      if(!key) return;
      const text = dict[key] ?? dict[key.split('.').pop()];
      if(text !== undefined) el.placeholder = text;
    });
  }
  function setDocumentDirection(lang){
    if(lang === 'ar' || lang === 'fa' || lang === 'he'){
      document.documentElement.lang = lang;
      document.documentElement.dir = 'rtl';
      document.body.dir = 'rtl';
      document.body.style.textAlign = 'right';
    } else {
      document.documentElement.lang = lang;
      document.documentElement.dir = 'ltr';
      document.body.dir = 'ltr';
      document.body.style.textAlign = 'left';
    }
  }
  async function applyLanguage(lang){
    try{
      const dict = await loadLocale(lang);
      applyDictionary(dict);
      setDocumentDirection(lang);
    }catch(e){}
  }
  function setLanguage(lang){
    if(!lang) lang = DEFAULT_LANG;
    localStorage.setItem(STORAGE_KEY, lang);
    applyLanguage(lang);
    document.querySelectorAll('[id^="lang-"]').forEach(b => b.classList.remove('active'));
    const el = document.getElementById('lang-' + lang);
    if(el) el.classList.add('active');
  }
  function getLanguage(){
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
  }
  async function init(){
    const saved = getLanguage();
    window.setLanguage = setLanguage;
    window.getLanguage = getLanguage;
    window.applyLanguage = applyLanguage;
    await applyLanguage(saved);
    window.addEventListener('storage', function(e){
      if(e.key === STORAGE_KEY) applyLanguage(e.newValue || DEFAULT_LANG);
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
