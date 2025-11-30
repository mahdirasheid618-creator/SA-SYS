
const Storage = (function(){
  function set(key, value){ try{ localStorage.setItem(key, JSON.stringify(value)); return true; }catch(e){ return false; } }
  function get(key, fallback=null){ try{ const v = localStorage.getItem(key); return v? JSON.parse(v) : fallback; }catch(e){ return fallback; } }
  function remove(key){ try{ localStorage.removeItem(key); return true; }catch(e){ return false; } }
  return { set, get, remove };
})();
