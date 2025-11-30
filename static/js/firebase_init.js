
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  serverTimestamp,
  onSnapshot,
  where,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
const firebaseConfig = {
  apiKey: "AIzaSyACogcD6ZBnndReXfPhI6w6PIKuk4cCTpI",
  authDomain: "sa-system-2eb6d.firebaseapp.com",
  projectId: "sa-system-2eb6d",
  storageBucket: "sa-system-2eb6d.firebasestorage.app",
  messagingSenderId: "940328232545",
  appId: "1:940328232545:web:5465d7c93751493e26ac20",
  measurementId: "G-5NR4GB8YWG"
};
const app = initializeApp(firebaseConfig);
try { getAnalytics(app); } catch (e) { }
const db = getFirestore(app);

// ضع مرجع قاعدة البيانات في window للوصول إليها من ملفات أخرى
window.firebaseDb = db;
async function getPreferredCameraDeviceId() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return null;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter(d => d.kind === 'videoinput');
    if (!videoInputs.length) return null;
    const preferredKeywords = ['integrated', 'builtin', 'built-in', 'internal', 'face', 'facetime', 'camera'];
    const candidates = videoInputs.filter(d => {
      const lab = (d.label || '').toLowerCase();
      return preferredKeywords.some(k => lab.includes(k)) && !lab.includes('usb');
    });
    if (candidates.length) return candidates[0].deviceId;
    const nonUsb = videoInputs.filter(d => !(d.label || '').toLowerCase().includes('usb'));
    if (nonUsb.length) return nonUsb[0].deviceId;
    return videoInputs[0].deviceId;
  } catch (e) {
    return null;
  }
}
async function startStreamWithPreferredCamera(constraints = { video: true }) {
  try {
    const preferredId = await getPreferredCameraDeviceId();
    if (preferredId) {
      return await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: preferredId } } });
    }
  } catch (e) {
  }
  return navigator.mediaDevices.getUserMedia(constraints);
}
const studentsCol = collection(db, 'StudentTB');
const usersCol = collection(db, 'UsersAndRoles');
const instructorsCol = collection(db, 'Instructors');
const visitorsCol = collection(db, 'Visitors');
async function addStudent(data) {
  const payload = {
    full_name: data.full_name || '',
    department: data.department || '',
    stage: data.stage || '',
    phone: data.phone || '',
    age: data.age || null,
    face_embedding: data.face_embedding || null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  };
  try {
    const docRef = await addDoc(studentsCol, payload);
    return docRef.id;
  } catch (err) {
    throw err;
  }
}
function subscribeStudents(onChangeCallback) {
  return onSnapshot(studentsCol, snapshot => {
    const students = [];
    snapshot.forEach(doc => {
      students.push({ id: doc.id, ...doc.data() });
    });
    onChangeCallback(students);
  }, err => {
    try {
      fetch('/api/students').then(r => {
        const ct = r.headers.get('content-type') || '';
        if (!r.ok) {
          if (ct.includes('application/json')) return r.json().then(j => ({ ok: false, json: j }));
          return r.text().then(t => ({ ok: false, text: t }));
        }
        if (ct.includes('application/json')) return r.json().then(j => ({ ok: true, json: j }));
        return r.text().then(t => ({ ok: true, text: t }));
      }).then(payload => {
        if (!payload.ok) {
          onChangeCallback([]);
          return;
        }
        if (payload.json) {
          const data = payload.json;
          if (data && data.success && Array.isArray(data.students)) {
            onChangeCallback(data.students);
            return;
          }
          onChangeCallback([]);
          return;
        }
        onChangeCallback([]);
      }).catch(fetchErr => {
        onChangeCallback([]);
      });
    } catch (e) {
      onChangeCallback([]);
    }
  });
}
async function fetchStudents() {
  try {
    const snapshot = await getDocs(studentsCol);
    const students = [];
    snapshot.forEach(doc => students.push({ id: doc.id, ...doc.data() }));
    return students;
  } catch (err) {
    throw err;
  }
}
function subscribeUsersAndRoles(onChangeCallback) {
  const q = query(usersCol, orderBy('AddedDate', 'desc'));
  return onSnapshot(q, snapshot => {
    const users = [];
    snapshot.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
    onChangeCallback(users);
  }, err => {
  });
}
function _isSupervisorRecord(u) {
  if (!u) return false;
  const candidateFields = [u.Roles, u.roles, u.Role, u.role, u.RolesTitle, u.RoleName, u.roleName, u.Title, u.title, u.JobTitle, u.job_title];
  const keywords = ['supervisor', 'supervisors', 'مشرف', 'مشرفة', 'مشرفين', 'مشرفه', 'مشرف/مشرفة'];
  const containsKeyword = (val) => {
    if (val === null || val === undefined) return false;
    try {
      if (Array.isArray(val)) {
        return val.some(v => containsKeyword(v));
      }
      if (typeof val === 'object') {
        const sub = val.name || val.title || val.role || val.Role || val.Name;
        if (sub) return containsKeyword(sub);
        return keywords.some(k => JSON.stringify(val).toLowerCase().includes(k));
      }
      const s = String(val).toLowerCase();
      return keywords.some(k => s.includes(k));
    } catch (e) { return false; }
  };
  for (const field of candidateFields) {
    if (containsKeyword(field)) return true;
  }
  for (const k of Object.keys(u || {})) {
    try {
      const v = u[k];
      if (containsKeyword(v)) return true;
    } catch (e) { }
  }
  return false;
}
function subscribeSupervisorsCount(onCount) {
  return onSnapshot(usersCol, snapshot => {
    let count = 0;
    snapshot.forEach(doc => {
      const d = doc.data();
      if (_isSupervisorRecord(d)) count++;
    });
    try { onCount(count); } catch (e) { }
  }, err => {
    try { onCount(0); } catch (e) { }
  });
}
async function getSupervisorsCount() {
  try {
    const snapshot = await getDocs(usersCol);
    let count = 0;
    snapshot.forEach(doc => { if (_isSupervisorRecord(doc.data())) count++; });
    return count;
  } catch (err) {
    throw err;
  }
}
async function fetchSupervisors() {
  try {
    const snapshot = await getDocs(usersCol);
    const supervisors = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      if (_isSupervisorRecord(d)) supervisors.push({ id: doc.id, ...d });
    });
    return supervisors;
  } catch (err) {
    throw err;
  }
}
async function fetchAllUsers() {
  try {
    const snapshot = await getDocs(usersCol);
    const users = [];
    snapshot.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
    return users;
  } catch (err) {
    console.error('خطأ في جلب جميع المستخدمين:', err);
    throw err;
  }
}
function subscribeSupervisors(onChange) {
  return onSnapshot(usersCol, snapshot => {
    const supervisors = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      if (_isSupervisorRecord(d)) supervisors.push({ id: doc.id, ...d });
    });
    try { onChange(supervisors); } catch (e) { }
  }, err => {
    try { onChange([]); } catch (e) { }
  });
}
async function addUser(data) {
  const payload = {
    FullName: data.full_name || '',
    Username: data.username || '',
    Password: data.password || '',
    PhoneNumber: data.phone || '',
    Roles: data.roles || '',
    Scientific_title: data.scientific_title || '',
    photo: data.photo || data.Photo || null,
    Photo: data.photo || data.Photo || null,
    AddedDate: serverTimestamp()
  };
  try {
    const docRef = await addDoc(usersCol, payload);
    return docRef.id;
  } catch (err) {
    console.error('addUser failed', err);
    throw err;
  }
}
async function deleteUser(id) {
  const d = doc(db, 'UsersAndRoles', id);
  await deleteDoc(d);
}
async function getUser(id) {
  try {
    const d = doc(db, 'UsersAndRoles', id);
    const snap = await getDoc(d);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (err) {
    throw err;
  }
}
async function updateUser(id, updates) {
  const d = doc(db, 'UsersAndRoles', id);
  await updateDoc(d, { ...updates, UpdatedDate: serverTimestamp() });
}
async function addInstructor(data) {
  const payload = {
    name: data.name || '',
    job_title: data.job_title || '',
    degree: data.degree || null,
    username: data.username || '',
    password: data.password || '',
    phone: data.phone || '',
    photo: data.photo || null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  };
  try {
    const docRef = await addDoc(instructorsCol, payload);
    return docRef.id;
  } catch (err) {
    throw err;
  }
}
function subscribeInstructors(onChangeCallback) {
  return onSnapshot(instructorsCol, snapshot => {
    const instructors = [];
    snapshot.forEach(doc => {
      instructors.push({ id: doc.id, ...doc.data() });
    });
    onChangeCallback(instructors);
  }, err => {
    onChangeCallback([]);
  });
}
async function getInstructor(id) {
  try {
    const d = doc(db, 'Instructors', id);
    const snap = await getDoc(d);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (err) {
    throw err;
  }
}
async function updateInstructor(id, updates) {
  const d = doc(db, 'Instructors', id);
  await updateDoc(d, { ...updates, updated_at: serverTimestamp() });
}
async function deleteInstructor(id) {
  const d = doc(db, 'Instructors', id);
  await deleteDoc(d);
}
async function addVisitor(data) {
  const payload = {
    page: data.page || '',
    path: data.path || '',
    user_agent: data.user_agent || '',
    meta: data.meta || null,
    created_at: serverTimestamp()
  };
  try {
    const docRef = await addDoc(visitorsCol, payload);
    return docRef.id;
  } catch (err) {
    throw err;
  }
}
function subscribeVisitors(onChangeCallback) {
  return onSnapshot(visitorsCol, snapshot => {
    const visitors = [];
    snapshot.forEach(doc => visitors.push({ id: doc.id, ...doc.data() }));
    onChangeCallback(visitors);
  }, err => {
    onChangeCallback([]);
  });
}
async function fetchVisitors() {
  try {
    const snapshot = await getDocs(visitorsCol);
    const visitors = [];
    snapshot.forEach(doc => visitors.push({ id: doc.id, ...doc.data() }));
    return visitors;
  } catch (err) {
    throw err;
  }
}
function subscribeCollectionCount(collectionRef, onCount) {
  return onSnapshot(collectionRef, snapshot => {
    onCount(snapshot.size);
  }, err => { });
}
async function getStudent(id) {
  try {
    const d = doc(db, 'StudentTB', id);
    const snap = await getDoc(d);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (err) {
    throw err;
  }
}
async function updateStudent(id, updates) {
  const d = doc(db, 'StudentTB', id);
  await updateDoc(d, { ...updates, updated_at: serverTimestamp() });
}
async function deleteStudent(id) {
  const d = doc(db, 'StudentTB', id);
  await deleteDoc(d);
}
async function getAllStudents() {
  try {
    const snapshot = await getDocs(studentsCol);
    const students = [];
    snapshot.forEach(doc => {
      students.push({ id: doc.id, ...doc.data() });
    });
    return students;
  } catch (err) {
    console.error('خطأ في جلب جميع الطلاب:', err);
    throw err;
  }
}
const attendanceCol = collection(db, 'AttendanceTB');
async function addAttendance(data) {
  const payload = {
    student_id: data.student_id || '',
    student_name: data.student_name || '',
    stage: data.stage || '',
    date: data.date || '',
    time: data.time || '',
    lecture_name: data.lecture_name || '-',
    lecturer_name: data.lecturer_name || '-',
    duration: data.duration || '-',
    created_at: serverTimestamp()
  };
  try {
    const docRef = await addDoc(attendanceCol, payload);
    return docRef.id;
  } catch (err) {
    console.error('خطأ في إضافة الحضور:', err);
    throw err;
  }
}
async function getAttendanceRecords() {
  try {
    const q = query(attendanceCol, orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    const records = [];
    snapshot.forEach(doc => {
      records.push({ id: doc.id, ...doc.data() });
    });
    return records;
  } catch (err) {
    console.error('خطأ في جلب سجلات الحضور:', err);
    throw err;
  }
}
window.FirebaseAPI = {
  addStudent,
  subscribeStudents,
  fetchStudents,
  getStudent,
  updateStudent,
  deleteStudent,
  getAllStudents,
  addAttendance,
  getAttendanceRecords,
  subscribeUsersAndRoles,
  fetchAllUsers,
  addUser,
  getUser,
  getSupervisorsCount,
  subscribeSupervisorsCount,
  fetchSupervisors,
  subscribeSupervisors,
  updateUser,
  subscribeCollectionCount,
  deleteUser,
  addInstructor,
  subscribeInstructors,
  getInstructor,
  updateInstructor,
  deleteInstructor,
  addVisitor,
  subscribeVisitors,
  fetchVisitors,
  getPreferredCameraDeviceId,
  startStreamWithPreferredCamera
};
window.FirebaseReady = Promise.resolve().then(() => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(window.FirebaseAPI);
    }, 100);
  });
});
export { addStudent, subscribeStudents, fetchStudents, getStudent, updateStudent, deleteStudent, getUser, addUser, getSupervisorsCount, subscribeSupervisorsCount, fetchSupervisors, subscribeSupervisors, updateUser, addInstructor, subscribeInstructors, getInstructor, updateInstructor, deleteInstructor, addVisitor, subscribeVisitors, fetchVisitors, getPreferredCameraDeviceId, startStreamWithPreferredCamera };
