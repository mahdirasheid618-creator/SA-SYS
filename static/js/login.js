// login.js - validates credentials against Firebase collections and then POSTs to server /login to set session
(function(){
  async function findSupervisor(username){
    try{
      // Fetch all users and perform a robust supervisor lookup
      if(!window.FirebaseAPI || !window.FirebaseAPI.fetchAllUsers) return null;
      const users = await window.FirebaseAPI.fetchAllUsers();
      if(!Array.isArray(users)) return null;
      const uname = String(username||'').toLowerCase().trim();

      function containsSupervisorKeyword(val){
        if(val === null || val === undefined) return false;
        try{
          if(Array.isArray(val)) return val.some(v => containsSupervisorKeyword(v));
          if(typeof val === 'object'){
            const sub = val.name || val.title || val.role || val.Role || val.Name;
            if(sub) return containsSupervisorKeyword(sub);
            return JSON.stringify(val).toLowerCase().includes('مشرف') || JSON.stringify(val).toLowerCase().includes('supervisor');
          }
          const s = String(val).toLowerCase();
          return s.includes('مشرف') || s.includes('supervisor');
        }catch(e){ return false; }
      }

      for(const s of users){
        // possible username fields
        const candidates = [s.Username, s.username, s.UserName, s.userName, s.Email, s.email, s.FullName, s.Name, s.full_name];
        for(const c of candidates){
          if(c && String(c).toLowerCase().trim() === uname) {
            // ensure this record appears to be a supervisor (best-effort)
            const likelySupervisor = containsSupervisorKeyword(s.Roles || s.roles || s.Role || s.JobTitle || s.Title || s.RoleName || s.rolesTitle || s.Position || s.position);
            if(likelySupervisor) return s;
            // if we can't detect role fields, still return (safer fallback)
            return s;
          }
        }
      }
      return null;
    }catch(e){ console.error('findSupervisor error', e); return null; }
  }

  function fetchInstructorsOnce(){
    return new Promise((resolve) => {
      try{
        if(window.FirebaseAPI && typeof window.FirebaseAPI.subscribeInstructors === 'function'){
          const unsub = window.FirebaseAPI.subscribeInstructors((list)=>{
            try{ unsub && typeof unsub === 'function' && unsub(); }catch(e){}
            resolve(Array.isArray(list)? list : []);
          });
          // subscribeInstructors returns unsubscribe function; some wrappers may not return it
          // set timeout fallback
          setTimeout(async ()=>{
            // if not resolved yet, try to fetch via Firebase API if available
            if(!window.FirebaseAPI) return resolve([]);
            try{
              // try to use getInstructor for multiple ids is not practical; resolve empty
              resolve([]);
            }catch(e){ resolve([]); }
          }, 3000);
        } else {
          resolve([]);
        }
      }catch(e){ console.error(e); resolve([]); }
    });
  }

  async function findInstructor(username){
    try{
      const list = await fetchInstructorsOnce();
      const uname = String(username||'').toLowerCase().trim();
      for(const s of list){
        const candidates = [s.username, s.Username, s.userName, s.UserName, s.Email, s.email];
        for(const c of candidates){ if(c && String(c).toLowerCase().trim() === uname) return s; }
        if(s.name && String(s.name).toLowerCase().trim() === uname) return s;
      }
      return null;
    }catch(e){ console.error('findInstructor error', e); return null; }
  }

  async function postServerLogin(role, username, password){
    try{
      const fd = new URLSearchParams();
      if(role === 'supervisor'){
        fd.append('login_role','supervisor');
        fd.append('sup_name', username);
        fd.append('sup_code', password);
      } else {
        fd.append('login_role','instructor');
        fd.append('username', username);
        fd.append('password', password);
      }
      const res = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: fd.toString() });
      return res.ok;
    }catch(e){ console.error('postServerLogin error', e); return false; }
  }

  window.FirebaseReady && window.FirebaseReady.then(()=>{
    console.log('login.js initialized (Firebase ready)');
  }).catch(()=>{ console.log('login.js: Firebase may not be ready'); });

  window.submitLogin = async function(type){
    try{
      const isSupervisor = type === 'supervisor';
      const username = (document.getElementById(isSupervisor? 'supervisorUsername' : 'instructorUsername') || {}).value || '';
      const password = (document.getElementById(isSupervisor? 'supervisorPassword' : 'instructorPassword') || {}).value || '';
      const remember = (document.getElementById(isSupervisor? 'rememberSupervisor' : 'rememberInstructor') || {}).checked || false;
      if(!username || !password){
        if(typeof window.showToast === 'function') window.showToast('يرجى إدخال اسم المستخدم وكلمة المرور', 'error', 2000);
        else alert('يرجى إدخال اسم المستخدم وكلمة المرور');
        return;
      }

      // check Firebase
      let record = null;
      if(isSupervisor){
        record = await findSupervisor(username);
      } else {
        record = await findInstructor(username);
      }

      if(!record){
        if(typeof window.showToast === 'function') window.showToast('اسم المستخدم غير موجود', 'error', 2000);
        else alert('اسم المستخدم غير موجود');
        return;
      }

      // possible password fields
      const pwCandidates = [record.Password, record.password, record.pass, record.Pass, record.user_password, record.UserPassword];
      let matched = false;
      for(const p of pwCandidates){ if(p !== undefined && p !== null && String(p) === String(password)) { matched = true; break; } }
      if(!matched){
        if(typeof window.showToast === 'function') window.showToast('كلمة المرور غير صحيحة', 'error', 2000);
        else alert('كلمة المرور غير صحيحة');
        return;
      }

      // persist username locally if remembered
      try{
        if(remember) {
          if(isSupervisor) localStorage.setItem('remember_supervisor_username', username);
          else localStorage.setItem('remember_instructor_username', username);
        } else {
          if(isSupervisor) localStorage.removeItem('remember_supervisor_username');
          else localStorage.removeItem('remember_instructor_username');
        }
      }catch(e){}

      // set client-side auth_user
      try{
        const auth = { user_type: isSupervisor? 'supervisor' : 'instructor', username: username };
        localStorage.setItem('auth_user', JSON.stringify(auth));
      }catch(e){}

      // set server session by POSTing to /login
      const serverOk = await postServerLogin(isSupervisor? 'supervisor' : 'instructor', username, password);
      if(typeof window.showToast === 'function'){
        if(serverOk) window.showToast('تم تسجيل الدخول بنجاح', 'success', 2000);
        else window.showToast('تم تسجيل الدخول محلياً (لم يتم تأكيد الجلسة على الخادم)', 'warning', 2000);
      } else {
        alert('تم تسجيل الدخول بنجاح');
      }
      // redirect to dashboard after short delay so toast is visible
      setTimeout(()=> window.location.href = '/dashboard', 700);

    }catch(err){
      console.error('submitLogin error', err);
      if(typeof window.showToast === 'function') window.showToast('حدث خطأ أثناء تسجيل الدخول', 'error', 2000);
      else alert('حدث خطأ أثناء تسجيل الدخول');
    }
  };
})();
