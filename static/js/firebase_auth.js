

(function(window){

  async function waitForFirebaseReady(timeoutMs = 5000) {
    if (window.FirebaseReady && typeof window.FirebaseReady.then === 'function') {
      return window.FirebaseReady;
    }
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const t = setInterval(() => {
        if (window.FirebaseAPI) {
          clearInterval(t);
          resolve(window.FirebaseAPI);
          return;
        }
        if (Date.now() - start > timeoutMs) {
          clearInterval(t);
          reject(new Error('Firebase not ready'));
        }
      }, 150);
    });
  }

  async function checkConnection() {
    try {
      await waitForFirebaseReady(6000);
      if (window.FirebaseAPI && typeof window.FirebaseAPI.fetchStudents === 'function') {
        try {
          await window.FirebaseAPI.fetchStudents();
          return { ok: true };
        } catch (err) {
          return { ok: false, error: 'fetch_error', detail: err.message || String(err) };
        }
      }
      if (window.FirebaseAPI && typeof window.FirebaseAPI.subscribeUsersAndRoles === 'function') {
        return new Promise((resolve) => {
          const unsub = window.FirebaseAPI.subscribeUsersAndRoles((users) => {
            try { unsub(); } catch(e){}
            resolve({ ok: true });
          });
          setTimeout(()=>{
            try{ if (typeof unsub === 'function') unsub(); }catch(e){}
            resolve({ ok: false, error: 'timeout' });
          }, 5000);
        });
      }
      return { ok: false, error: 'no_api' };
    } catch (err) {
      return { ok: false, error: 'not_ready', detail: err.message || String(err) };
    }
  }

  // ============================================
  // Supervisor (Manager) Login
  // ============================================
  async function findSupervisor(name, code) {
    try {
      await waitForFirebaseReady(6000);
      if (!window.FirebaseAPI || typeof window.FirebaseAPI.subscribeUsersAndRoles !== 'function') {
        throw new Error('Firebase supervisors API not available');
      }

      return new Promise((resolve, reject) => {
        const unsub = window.FirebaseAPI.subscribeUsersAndRoles((users) => {
          try { if (unsub) unsub(); } catch(e){}
          
          if (!Array.isArray(users)) {
            resolve(null);
            return;
          }

          const nameNorm = (name || '').trim();
          const codeNorm = (code || '').trim();
          const nameFields = ['Username', 'username', 'FullName', 'full_name', 'Fullname', 'name', 'Email', 'email', 'user'];
          const codeFields = ['code', 'access_code', 'password', 'pin', 'Code', 'AccessCode', 'pass', 'pwd'];

          // البحث عن المستخدم
          for (const user of users) {
            if (!user || typeof user !== 'object') continue;

            // مطابقة الاسم
            let nameMatched = false;
            for (const field of nameFields) {
              const value = user[field];
              if (value && String(value).trim() === nameNorm) {
                nameMatched = true;
                break;
              }
            }

            if (!nameMatched) continue;

            // مطابقة الكود
            for (const field of codeFields) {
              const value = user[field];
              if (value && String(value).trim() === codeNorm) {
                // وجدنا تطابق!
                resolve({
                  id: user.id,
                  data: user,
                  username: user.Username || user.username || name,
                  displayName: user.FullName || user.Fullname || user.full_name || name
                });
                return;
              }
            }
          }

          resolve(null); // لم نجد تطابق
        });

        setTimeout(()=>{
          try{ if (typeof unsub === 'function') unsub(); }catch(e){}
          resolve(null);
        }, 6000);
      });
    } catch (error) {
      console.error('Error finding supervisor:', error);
      return null;
    }
  }

  async function loginSupervisorClient(name, code) {
    try {
      const user = await findSupervisor(name, code);
      if (!user) {
        return { success: false, error: 'بيانات المشرف غير صحيحة' };
      }

      // استخراج الصلاحيات
      const permissions = extractPermissions(user.data);

      return {
        success: true,
        user: user,
        role: 'supervisor',
        permissions: permissions
      };
    } catch (error) {
      console.error('Supervisor login error:', error);
      return { success: false, error: 'خطأ في عملية التحقق' };
    }
  }

  // ============================================
  // Instructor Login
  // ============================================
  async function findInstructor(username, password) {
    try {
      await waitForFirebaseReady(6000);
      if (!window.FirebaseAPI || typeof window.FirebaseAPI.subscribeInstructors !== 'function') {
        throw new Error('Firebase instructors API not available');
      }

      return new Promise((resolve, reject) => {
        const unsub = window.FirebaseAPI.subscribeInstructors((instructors) => {
          try { if (unsub) unsub(); } catch(e){}

          if (!Array.isArray(instructors)) {
            resolve(null);
            return;
          }

          const usernameNorm = (username || '').trim();
          const passwordNorm = (password || '').trim();
          const usernameFields = ['username', 'Username', 'name', 'Name', 'email', 'Email'];
          const passwordFields = ['password', 'Password', 'pwd', 'Pwd', 'pass', 'Pass'];

          // البحث عن الأستاذ
          for (const instructor of instructors) {
            if (!instructor || typeof instructor !== 'object') continue;

            // مطابقة اسم المستخدم
            let usernameMatched = false;
            for (const field of usernameFields) {
              const value = instructor[field];
              if (value && String(value).trim() === usernameNorm) {
                usernameMatched = true;
                break;
              }
            }

            if (!usernameMatched) continue;

            // مطابقة كلمة المرور
            for (const field of passwordFields) {
              const value = instructor[field];
              if (value && String(value).trim() === passwordNorm) {
                // وجدنا تطابق!
                resolve({
                  id: instructor.id,
                  data: instructor,
                  username: instructor.username || username,
                  displayName: instructor.name || instructor.full_name || username
                });
                return;
              }
            }
          }

          resolve(null); // لم نجد تطابق
        });

        setTimeout(()=>{
          try{ if (typeof unsub === 'function') unsub(); }catch(e){}
          resolve(null);
        }, 6000);
      });
    } catch (error) {
      console.error('Error finding instructor:', error);
      return null;
    }
  }

  async function loginInstructorClient(username, password) {
    try {
      const user = await findInstructor(username, password);
      if (!user) {
        return { success: false, error: 'بيانات الأستاذ غير صحيحة' };
      }

      return {
        success: true,
        user: user,
        role: 'instructor',
        permissions: 'default'
      };
    } catch (error) {
      console.error('Instructor login error:', error);
      return { success: false, error: 'خطأ في عملية التحقق' };
    }
  }

  // Compatibility wrappers expected by some pages
  async function authenticateSupervisor(name, code) {
    // use the existing loginSupervisorClient which returns {success,..}
    return await loginSupervisorClient(name, code);
  }

  async function authenticateInstructor(username, password) {
    return await loginInstructorClient(username, password);
  }

  // ============================================
  // Permissions & Roles
  // ============================================
  function extractPermissions(userData) {
    if (!userData || typeof userData !== 'object') return 'default';

    const candidateFields = [
      userData.permissions,
      userData.Permissions,
      userData.privilege,
      userData.Privilege,
      userData.access_level,
      userData.AccessLevel,
      userData.role,
      userData.Role,
      userData.level,
      userData.Level
    ];

    for (const field of candidateFields) {
      if (!field) continue;
      const str = String(field).toLowerCase();
      if (str.includes('limit')) return 'limited';
      if (str.includes('full')) return 'full';
      if (str.includes('admin')) return 'full';
    }

    return 'default';
  }

  function saveUserSession(userData, role, permissions) {
    try {
      const sessionData = {
        user_id: userData.id,
        username: userData.username,
        display_name: userData.displayName,
        role: role,
        permissions: permissions,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('auth_user', JSON.stringify(sessionData));
      return sessionData;
    } catch (error) {
      console.error('Error saving session:', error);
      return null;
    }
  }

  function loadUserSession() {
    try {
      // حاول قراءة جلسة من localStorage أولاً
      const data = localStorage.getItem('auth_user');
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }

    // لا توجد جلسة محفوظة — أنشئ جلسة مشرف تجريبية كاملة لتخطي تسجيل الدخول
    try {
      const mock = {
        user_id: 'dev-supervisor',
        username: 'dev',
        display_name: 'مشرف (تجريبي)',
        role: 'supervisor',
        permissions: 'full',
        timestamp: new Date().toISOString()
      };
      try { localStorage.setItem('auth_user', JSON.stringify(mock)); } catch(e){}
      return mock;
    } catch (e) {
      return null;
    }
  }

  function clearUserSession() {
    try {
      localStorage.removeItem('auth_user');
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }

  function isLoggedIn() {
    const session = loadUserSession();
    return session !== null && session.user_id !== undefined;
  }

  function getCurrentUser() {
    return loadUserSession();
  }

  // Backwards-compatible alias used by many pages
  function getUserSession() {
    return getCurrentUser();
  }

  // ============================================
  // Server-Side Login (Fallback)
  // ============================================
  async function serverLogin(loginRole, credentials) {
    const form = new FormData();
    form.append('login_role', loginRole);
    
    if (loginRole === 'supervisor') {
      form.append('sup_name', credentials.sup_name || '');
      form.append('sup_code', credentials.sup_code || '');
    } else {
      form.append('username', credentials.username || '');
      form.append('password', credentials.password || '');
    }

    const resp = await fetch('/login', { 
      method: 'POST', 
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      body: form 
    });

    if (!resp.ok) {
      try {
        const data = await resp.json();
        return { ok: false, status: resp.status, error: data.error || 'خطأ في الخادم' };
      } catch (e) {
        const txt = await resp.text();
        return { ok: false, status: resp.status, error: txt || 'خطأ في الخادم' };
      }
    }

    return { ok: true };
  }

  // ============================================
  // Legacy Functions for Backward Compatibility
  // ============================================
  function findInListByField(list, fieldNames, username) {
    if (!Array.isArray(list)) return null;
    const uname = (username || '').toString();
    for (const item of list) {
      for (const f of fieldNames) {
        if (item && Object.prototype.hasOwnProperty.call(item, f)) {
          const val = item[f];
          if (val && val.toString() === uname) return item;
        }
      }
    }
    return null;
  }

  async function loginManagerClient(username, password) {
    await waitForFirebaseReady(6000);
    if (!window.FirebaseAPI || typeof window.FirebaseAPI.subscribeUsersAndRoles !== 'function') {
      throw new Error('Firebase users API not available');
    }
    return new Promise((resolve, reject) => {
      const unsub = window.FirebaseAPI.subscribeUsersAndRoles((users) => {
        try {
          if (unsub) try { unsub(); } catch(e){}
        } catch(e){}
        const u = findInListByField(users, ['Username', 'username', 'Username'.toLowerCase()], username);
        if (!u) {
          resolve({ success: false, error: 'not_found' });
          return;
        }
        const stored = u.Password || u.password || '';
        if (stored === password) {
          resolve({ success: true, user: u });
        } else {
          resolve({ success: false, error: 'wrong_password' });
        }
      });
      setTimeout(()=>{
        try{ if (typeof unsub === 'function') unsub(); }catch(e){}
        resolve({ success: false, error: 'timeout' });
      }, 6000);
    });
  }

  // ============================================
  // Public API
  // ============================================
  window.AuthAPI = {
    // Connection
    waitForFirebaseReady,
    checkConnection,

    // Supervisor/Manager
    findSupervisor,
    loginSupervisorClient,

    // Instructor
    findInstructor,
    loginInstructorClient,

    // Session Management
    saveUserSession,
    loadUserSession,
    clearUserSession,
    isLoggedIn,
    getCurrentUser,
    getUserSession,
    extractPermissions,

    // Server
    serverLogin,

    // Legacy
    loginManagerClient,
    findInListByField
  };

})(window);

