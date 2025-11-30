
let charts = {};
let firebaseData = {
    students: [],
    instructors: [],
    usersAndRoles: [],
    users: [],
    attendance: [],
    absence: []
};
document.addEventListener('DOMContentLoaded', function() {
    setupReportButtons();
    loadFirebaseData();
});
function setupReportButtons() {
    const reportButtons = document.querySelectorAll('.report-btn');
    reportButtons.forEach(button => {
        button.addEventListener('click', function() {
            const reportType = this.getAttribute('data-report');
            // Buttons are now print/export-only and should NOT change the visible UI
            // Do not call switchReport or toggle active classes here.
            try {
                exportReport(reportType);
            } catch(e) {
                console.error('exportReport failed', e);
            }
        });
    });
}

// Export helpers: fetch data and write XLSX
function exportReport(reportType) {
    if (!['overview','instructors','supervisors'].includes(reportType)) {
        // Not implemented for attendance/absence yet
        console.warn('Export not implemented for', reportType);
        return;
    }
    // Map report type to data source and filename
    const map = {
        overview: { key: 'students', filename: 'students' },
        instructors: { key: 'instructors', filename: 'instructors' },
        supervisors: { key: 'users', filename: 'supervisors' }
    };
    const cfg = map[reportType];
    fetchDataForReport(cfg.key).then(list => {
        if (!list || !list.length) {
            alert('لا توجد بيانات لتصدير ' + cfg.filename);
            return;
        }
        // Normalize objects to flat records
        const rows = list.map(item => normalizeRecord(cfg.key, item));
        exportToExcel(rows, cfg.filename + '.xlsx', cfg.key);
    }).catch(err => {
        console.error('Failed to fetch data for export', err);
        alert('فشل في جلب البيانات للتصدير');
    });
}

function fetchDataForReport(key) {
    return new Promise((resolve, reject) => {
        // Prefer already-subscribed firebaseData
        if (key === 'students' && Array.isArray(firebaseData.students) && firebaseData.students.length) return resolve(firebaseData.students);
        if (key === 'instructors' && Array.isArray(firebaseData.instructors) && firebaseData.instructors.length) return resolve(firebaseData.instructors);
        if (key === 'users' && Array.isArray(firebaseData.users) && firebaseData.users.length) return resolve(firebaseData.users);

        // Try FirebaseAPI fetch methods if available
        try {
            if (window.FirebaseAPI) {
                if (key === 'students' && typeof window.FirebaseAPI.fetchStudents === 'function') return window.FirebaseAPI.fetchStudents().then(resolve).catch(()=>{});
                if (key === 'instructors' && typeof window.FirebaseAPI.fetchInstructors === 'function') return window.FirebaseAPI.fetchInstructors().then(resolve).catch(()=>{});
                if (key === 'users' && typeof window.FirebaseAPI.subscribeUsersAndRoles === 'function') {
                    // subscribe once
                    const unsub = window.FirebaseAPI.subscribeUsersAndRoles((users) => {
                        try { resolve(users || []); } finally { try { if (typeof unsub === 'function') unsub(); } catch(e){} }
                    });
                    return;
                }
            }
        } catch(e){ console.warn('FirebaseAPI fetch attempt failed', e); }

        // Fallback to server endpoints
        const endpoints = {
            students: '/api/students',
            instructors: '/api/instructors',
            users: '/api/supervisors'
        };
        const url = endpoints[key];
        if (!url) return resolve([]);
        fetch(url, { credentials: 'same-origin' }).then(r => r.json()).then(j => {
            if (!j) return resolve([]);
            if (key === 'students' && j.students) return resolve(j.students);
            if (key === 'instructors' && j.instructors) return resolve(j.instructors);
            if (key === 'users' && j.supervisors) return resolve(j.supervisors || j.users || []);
            // generic
            resolve(j.users || j.supervisors || []);
        }).catch(err => reject(err));
    });
}

function normalizeRecord(key, item) {
    const out = {};
    try {
        if (key === 'students') {
            out['id'] = item.id || item.ID || '';
            out['full_name'] = item.full_name || item.fullName || item.name || '';
            out['department'] = item.department || item.dept || '';
            out['stage'] = item.stage || item.year || '';
            out['phone'] = item.phone || item.phone_number || '';
            out['date_added'] = formatPossibleDate(item.created_at || item.date_added || item.Added || item.added_at);
        } else if (key === 'instructors') {
            out['id'] = item.id || item.ID || '';
            out['name'] = item.name || item.full_name || '';
            out['job_title'] = item.job_title || item.title || '';
            out['degree'] = item.degree || '';
            out['department'] = item.department || item.school || '';
            out['username'] = item.username || item.user || '';
            out['phone'] = item.phone || '';
            out['date_added'] = formatPossibleDate(item.created_at || item.date_added || item.Added || item.added_at);
        } else if (key === 'users') {
            out['id'] = item.id || item.ID || '';
            out['full_name'] = item.FullName || item.full_name || item.name || '';
            out['username'] = item.Username || item.username || item.user || '';
            out['phone'] = item.PhoneNumber || item.phone || item.Phone || '';
            out['roles'] = Array.isArray(item.Roles) ? item.Roles.join(', ') : (item.Roles || item.role || '');
            out['department'] = item.department || item.dept || '';
            out['date_added'] = formatPossibleDate(item.AddedDate || item.addedDate || item.added_at || item.Added || item.created_at);
        } else {
            // Generic flatten
            Object.keys(item).forEach(k => out[k] = item[k]);
        }
    } catch(e){ console.warn('normalizeRecord error', e); }
    return out;
}

function formatPossibleDate(v) {
    try {
        if (!v) return '';
        if (typeof v === 'string') return v;
        if (typeof v === 'number') return new Date(v).toLocaleString('ar-EG');
        if (v && typeof v.toDate === 'function') return new Date(v.toDate()).toLocaleString('ar-EG');
        if (v.seconds) return new Date(v.seconds * 1000).toLocaleString('ar-EG');
        return String(v);
    } catch(e){ return '';} 
}

function exportToExcel(rows, filename, sheetName = 'Sheet1') {
    try {
        if (typeof XLSX === 'undefined') {
            alert('مكتبة XLSX غير محملة');
            return;
        }
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, filename);
    } catch (e) {
        console.error('exportToExcel error', e);
        alert('فشل تصدير الملف');
    }
}
function switchReport(reportType) {
    const sections = document.querySelectorAll('.report-section');
    sections.forEach(section => section.classList.remove('active'));
    const targetSection = document.getElementById(reportType);
    if (targetSection) {
        targetSection.classList.add('active');
        if (reportType === 'overview') {
            setTimeout(() => {
                redrawCharts();
            }, 100);
        }
    }
}
async function loadFirebaseData() {
    try {
        if (typeof window.FirebaseAPI === 'undefined') {
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (typeof window.FirebaseAPI !== 'undefined') {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
                setTimeout(() => {
                    clearInterval(checkInterval);
                    resolve();
                }, 5000);
            });
        }
        if (typeof window.FirebaseAPI === 'undefined') {
            initializeReportsWithMockData();
            return;
        }
        window.FirebaseAPI.subscribeStudents((students) => {
            firebaseData.students = students;
            updateReports();
        });
        window.FirebaseAPI.subscribeInstructors((instructors) => {
            firebaseData.instructors = instructors;
            updateReports();
        });
        window.FirebaseAPI.subscribeUsersAndRoles((users) => {
            firebaseData.users = users;
            updateReports();
        });
        if (typeof window.FirebaseAPI.subscribeSupervisors === 'function') {
            window.FirebaseAPI.subscribeSupervisors((supervisors) => {
                firebaseData.supervisors = supervisors;
                updateReports();
            });
        } else if (typeof window.FirebaseAPI.fetchSupervisors === 'function') {
            window.FirebaseAPI.fetchSupervisors().then(sup => {
                firebaseData.supervisors = sup;
                updateReports();
            }).catch(err => {});
        } else {
        }
        if (typeof window.FirebaseAPI.subscribeVisitors === 'function') {
            window.FirebaseAPI.subscribeVisitors((visitors) => {
                firebaseData.visitors = visitors;
                updateReports();
            });
        }
        try {
            recordVisit('reports');
        } catch (e) {
        }
        try { loadTotalSupervisors(); } catch(e) {}
    } catch (error) {
        initializeReportsWithMockData();
    }
}
function updateReports() {
    const reportData = processFirebaseData();
    if (firebaseData.visitors && firebaseData.visitors.length) {
        const vstats = computeVisitorStatsFromRaw(firebaseData.visitors);
        reportData.visitsToday = vstats.visitsToday;
        reportData.visitsTotal = vstats.visitsTotal;
        reportData.hourlyVisits = vstats.hourlyVisits;
        reportData.monthlyVisits = vstats.monthlyVisits;
    }
    updateSummaryCards(reportData);
    createCharts(reportData);
}
function recordVisit(pageName = 'unknown') {
    try {
        const key = `visit_recorded_${pageName}`;
        const today = new Date().toISOString().slice(0,10); 
        const stored = sessionStorage.getItem(key);
        if (stored === today) {
            return;
        }
        const payload = {
            page: pageName,
            path: location.pathname || '',
            user_agent: navigator.userAgent || '',
            meta: { host: location.hostname },
        };
        if (typeof window.FirebaseAPI !== 'undefined' && typeof window.FirebaseAPI.addVisitor === 'function') {
            window.FirebaseAPI.addVisitor(payload).then(id => {
                sessionStorage.setItem(key, today);
            }).catch(err => {
            });
        } else {
        }
    } catch (err) {
    }
}
function computeVisitorStatsFromRaw(visitors) {
    const now = new Date();
    const todayStr = now.toISOString().slice(0,10);
    let visitsToday = 0;
    let visitsTotal = visitors.length;
    const hourly = Array.from({length:24}, () => 0);
    const monthlyMap = new Map();
    visitors.forEach(v => {
        let dt = null;
        try {
            if (v.created_at && typeof v.created_at.toDate === 'function') dt = v.created_at.toDate();
            else if (v.created_at && v.created_at.seconds) dt = new Date(v.created_at.seconds * 1000);
            else dt = new Date(v.created_at || v.createdAt || v.createdAtRaw || Date.now());
        } catch (e) {
            dt = new Date();
        }
        const dstr = dt.toISOString().slice(0,10);
        if (dstr === todayStr) {
            visitsToday += 1;
            hourly[dt.getHours()] += 1;
        }
        const monthKey = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
    });
    const months = [];
    const monthlyVisits = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        months.push(key);
        monthlyVisits.push({ month: key, visits: monthlyMap.get(key) || 0 });
    }
    const hourlyVisits = hourly.map((count, hr) => ({ hour: hr, visits: count }));
    return {
        visitsToday,
        visitsTotal,
        hourlyVisits,
        monthlyVisits
    };
}
function processFirebaseData() {
    const students = firebaseData.students || [];
    const instructors = firebaseData.instructors || [];
    const supervisors = firebaseData.users || [];
    const totalStudents = students.length;
    const totalInstructors = instructors.length;
    const totalSupervisors = supervisors.length;
    const departments = [...new Set(students.map(s => s.department || 'بدون قسم'))];
    const totalDepartments = departments.length;
    const studentsByDept = {};
    const stagesByDept = {};
    departments.forEach(dept => {
        const deptStudents = students.filter(s => s.department === dept);
        studentsByDept[dept] = deptStudents.length;
        const stages = {};
        deptStudents.forEach(s => {
            const stage = s.stage || 'مرحلة غير محددة';
            stages[stage] = (stages[stage] || 0) + 1;
        });
        stagesByDept[dept] = stages;
    });
    const instructorsByDept = {};
    departments.forEach(dept => {
        instructorsByDept[dept] = instructors.filter(i => 
            i.department === dept || i.school === dept
        ).length;
    });
    const today = new Date();
    const todayVisits = Math.floor(Math.random() * 500) + 200;
    const totalVisits = Math.floor(Math.random() * 50000) + 10000;
    const hourlyVisits = [];
    for (let i = 0; i < 24; i++) {
        hourlyVisits.push({
            hour: i,
            visits: Math.floor(Math.random() * 100) + Math.floor(todayVisits / 24)
        });
    }
    const monthlyVisits = [];
    for (let i = 0; i < 12; i++) {
        monthlyVisits.push({
            month: i + 1,
            visits: Math.floor(Math.random() * 5000) + 1000
        });
    }
    const dailyAttendanceData = [];
    for (let i = 8; i < 18; i++) {
        dailyAttendanceData.push({
            hour: i,
            present: Math.floor(students.length * (0.7 + Math.random() * 0.3)),
            absent: Math.floor(students.length * (0.3 - Math.random() * 0.2))
        });
    }
    const monthlyAttendanceData = [];
    for (let i = 0; i < 12; i++) {
        monthlyAttendanceData.push({
            month: i + 1,
            present: Math.floor(students.length * 0.85),
            absent: Math.floor(students.length * 0.15)
        });
    }
    return {
        totalStudents,
        totalDepartments,
        totalInstructors,
        totalSupervisors,
        visitsToday: todayVisits,
        visitsTotal: totalVisits,
        departments,
        studentsByDept,
        stagesByDept,
        instructorsByDept,
        instructors,
        students,
        hourlyVisits,
        monthlyVisits,
        dailyAttendanceData,
        monthlyAttendanceData
    };
}
function initializeReportsWithMockData() {
    const mockData = {
        totalStudents: 245,
        totalDepartments: 8,
        totalInstructors: 32,
        totalSupervisors: 12,
        visitsToday: 342,
        visitsTotal: 15847,
        departments: ['علوم الحاسوب', 'الهندسة', 'إدارة الأعمال', 'الطب', 'القانون', 'التربية', 'الهندسة المدنية', 'الفنون'],
        studentsByDept: {
            'علوم الحاسوب': 45,
            'الهندسة': 38,
            'إدارة الأعمال': 32,
            'الطب': 28,
            'القانون': 25,
            'التربية': 22,
            'الهندسة المدنية': 30,
            'الفنون': 25
        },
        instructorsByDept: {
            'علوم الحاسوب': 8,
            'الهندسة': 7,
            'إدارة الأعمال': 6,
            'الطب': 5,
            'القانون': 6,
            'التربية': 4,
            'الهندسة المدنية': 4,
            'الفنون': 2
        },
        hourlyVisits: Array.from({length: 24}, (_, i) => ({
            hour: i,
            visits: Math.floor(Math.random() * 100) + 10
        })),
        monthlyVisits: Array.from({length: 12}, (_, i) => ({
            month: i + 1,
            visits: Math.floor(Math.random() * 5000) + 1000
        })),
        dailyAttendanceData: Array.from({length: 10}, (_, i) => ({
            hour: 8 + i,
            present: Math.floor(245 * (0.7 + Math.random() * 0.3))
        })),
        monthlyAttendanceData: Array.from({length: 12}, (_, i) => ({
            month: i + 1,
            present: Math.floor(245 * 0.85)
        }))
    };
    updateSummaryCards(mockData);
    createCharts(mockData);
}
function updateSummaryCards(data) {
    document.getElementById('total-students').textContent = data.totalStudents;
    document.getElementById('total-departments').textContent = data.totalDepartments;
    document.getElementById('total-instructors').textContent = data.totalInstructors;
    document.getElementById('total-supervisors').textContent = data.totalSupervisors;
    document.getElementById('visits-today').textContent = data.visitsToday;
    document.getElementById('visits-total').textContent = data.visitsTotal;
}
function loadTotalSupervisors() {
    if (typeof window.FirebaseAPI === 'undefined') return;
    if (typeof window.FirebaseAPI.getSupervisorsCount === 'function') {
        window.FirebaseAPI.getSupervisorsCount().then(count => {
            const el = document.getElementById('total-supervisors');
            if (el) el.textContent = count;
        }).catch(err => {});
        return;
    }
    if (typeof window.FirebaseAPI.subscribeSupervisors === 'function') {
        const unsub = window.FirebaseAPI.subscribeSupervisors((list) => {
            try {
                const el = document.getElementById('total-supervisors');
                if (el) el.textContent = (list && list.length) || 0;
            } catch (e) {
            } finally {
                try { if (typeof unsub === 'function') unsub(); } catch(e){}
            }
        });
        return;
    }
    if (typeof window.FirebaseAPI.subscribeUsersAndRoles === 'function') {
        const unsub = window.FirebaseAPI.subscribeUsersAndRoles((users) => {
            try {
                const el = document.getElementById('total-supervisors');
                if (el) el.textContent = (users && users.length) || 0;
            } catch (e) {
            } finally {
                try { if (typeof unsub === 'function') unsub(); } catch(e){}
            }
        });
    }
}
// Fallback: fetch supervisors via server API if FirebaseAPI is not available
async function fetchSupervisorsFromServer() {
    try {
        const resp = await fetch('/api/supervisors', { credentials: 'same-origin' });
        if (!resp.ok) return;
        const data = await resp.json();
        if (data && data.success) {
            const el = document.getElementById('total-supervisors');
            if (el) el.textContent = data.count || (data.supervisors && data.supervisors.length) || 0;
            // Populate supervisors table if present
            try {
                const tbody = document.getElementById('supervisors-table-body');
                const status = document.getElementById('supervisors-status');
                if (status) status.textContent = `تم جلب ${data.count || (data.supervisors && data.supervisors.length) || 0} مشرفين`;
                if (tbody) {
                    tbody.innerHTML = '';
                    const list = data.supervisors || [];
                    if (list.length === 0) {
                        const tr = document.createElement('tr');
                        tr.innerHTML = '<td colspan="6" style="padding:12px;color:#666;">لا توجد سجلات مشرفين.</td>';
                        tbody.appendChild(tr);
                    } else {
                        list.forEach(item => {
                            const fullname = item.FullName || item.full_name || item.Fullname || '';
                            const username = item.Username || item.username || item.user || '';
                            const phone = item.PhoneNumber || item.phone || item.Phone || '';
                            const roles = item.Roles ? (Array.isArray(item.Roles) ? item.Roles.join(', ') : item.Roles) : (item.role || item.Role || '');
                            let added = item.AddedDate || item.addedDate || item.added_at || item.Added || '';
                            try {
                                if (added && typeof added.toDate === 'function') added = added.toDate().toLocaleString();
                                else if (typeof added === 'number') added = new Date(added).toLocaleString();
                            } catch(e){}
                            const id = item.id || item.ID || '';
                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(fullname)}</td>
                                <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(username)}</td>
                                <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(phone)}</td>
                                <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(String(roles))}</td>
                                <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(String(added))}</td>
                                <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(id)}</td>
                            `;
                            tbody.appendChild(tr);
                        });
                    }
                }
            } catch (e) {
                // ignore table population errors
            }
        }
    } catch (e) {
        // ignore silently
    }
}

// Try to fetch from server if existing Firebase API could not supply the data
try { if (!window.FirebaseAPI) fetchSupervisorsFromServer(); } catch(e) { fetchSupervisorsFromServer(); }

// Attach refresh button handler
document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('refresh-supervisors');
    if (btn) btn.addEventListener('click', function() {
        const status = document.getElementById('supervisors-status');
        if (status) status.textContent = 'جارٍ التحديث...';
        fetchSupervisorsFromServer().then(() => {
            if (status) status.textContent = 'تم التحديث.';
            setTimeout(()=>{ if (status) status.textContent = ''; }, 3000);
        });
    });
});

// Simple HTML escape to avoid injecting raw values
function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str).replace(/[&"'<>]/g, function (s) {
        return ({'&':'&amp;','"':'&quot;',"'":"&#39;","<":"&lt;",">":"&gt;"})[s];
    });
}
const chartColors = {
    primary: '#667eea',
    secondary: '#764ba2',
    accent: '#f093fb',
    light: '#f0f4ff',
    dark: '#2d3748'
};
function createCharts(data) {
    createStudentsByDepartmentChart(data);
    createTotalStudentsChart(data);
    createInstructorsChart(data);
    createHourlyVisitsChart(data);
    createMonthlyVisitsChart(data);
    createDailyAttendanceChart(data);
    createMonthlyAttendanceChart(data);
}
function createStudentsByDepartmentChart(data) {
    if (charts.studentsByDepartment) {
        charts.studentsByDepartment.destroy();
    }
    const ctx = document.getElementById('studentsByDepartmentChart');
    if (!ctx) return;
    const departments = data.departments || [];
    const chartData = departments.map(dept => data.studentsByDept[dept] || 0);
    const backgroundColors = [
        '#667eea', '#764ba2', '#f093fb', '#f6ad55',
        '#fbb040', '#38b6ff', '#43dde6', '#fd7272'
    ];
    charts.studentsByDepartment = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: departments,
            datasets: [{
                data: chartData,
                backgroundColor: backgroundColors.slice(0, departments.length),
                borderColor: 'white',
                borderWidth: 3,
                hoverBorderWidth: 5,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 12, family: "'Cairo', sans-serif" },
                        padding: 20,
                        boxWidth: 15,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}
function createTotalStudentsChart(data) {
    if (charts.totalStudents) {
        charts.totalStudents.destroy();
    }
    const ctx = document.getElementById('totalStudentsChart');
    if (!ctx) return;
    const monthsArabic = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const now = new Date();
    const months = [];
    const monthlyData = [];
    for (let i = 7; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(monthsArabic[d.getMonth()]);
        monthlyData.push(0);
    }
    if (Array.isArray(data.students) && data.students.length) {
        data.students.forEach(s => {
            let dt = null;
            try {
                if (s.created_at && typeof s.created_at.toDate === 'function') dt = s.created_at.toDate();
                else if (s.created_at && s.created_at.seconds) dt = new Date(s.created_at.seconds * 1000);
                else dt = new Date(s.created_at || s.createdAt || s.createdAtRaw || Date.now());
            } catch (e) {
                dt = null;
            }
            if (!dt) return;
            for (let idx = 0; idx < months.length; idx++) {
                const ref = new Date(now.getFullYear(), now.getMonth() - (7 - idx), 1);
                if (dt.getFullYear() === ref.getFullYear() && dt.getMonth() === ref.getMonth()) {
                    monthlyData[idx] += 1;
                    break;
                }
            }
        });
    } else {
        for (let i = 0; i < monthlyData.length; i++) {
            monthlyData[i] = Math.floor(data.totalStudents * (0.45 + (i+1)/20));
        }
    }
    charts.totalStudents = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'إجمالي الطلاب',
                data: monthlyData,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: '#667eea',
                pointBorderColor: 'white',
                pointBorderWidth: 2,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        font: { size: 12, family: "'Cairo', sans-serif" },
                        usePointStyle: true
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: { family: "'Cairo', sans-serif" }
                    }
                },
                x: {
                    ticks: {
                        font: { family: "'Cairo', sans-serif" }
                    }
                }
            }
        }
    });
}
function createInstructorsChart(data) {
    if (charts.instructors) {
        charts.instructors.destroy();
    }
    const ctx = document.getElementById('instructorsChart');
    if (!ctx) return;
    const departments = data.departments || [];
    const chartData = departments.map(dept => data.instructorsByDept[dept] || 0);
    charts.instructors = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: departments,
            datasets: [{
                label: 'عدد الأساتذة',
                data: chartData,
                backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#f6ad55', '#fbb040', '#38b6ff', '#43dde6', '#fd7272'],
                borderRadius: 8,
                hoverBackgroundColor: ['#764ba2', '#f093fb', '#f6ad55', '#fbb040', '#667eea', '#43dde6', '#fd7272', '#38b6ff']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: {
                legend: {
                    labels: {
                        font: { size: 12, family: "'Cairo', sans-serif" }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        font: { family: "'Cairo', sans-serif" }
                    }
                },
                y: {
                    ticks: {
                        font: { family: "'Cairo', sans-serif" }
                    }
                }
            }
        }
    });
}
function createHourlyVisitsChart(data) {
    if (charts.hourlyVisits) {
        charts.hourlyVisits.destroy();
    }
    const ctx = document.getElementById('hourlyVisitsChart');
    if (!ctx) return;
    const hourLabels = Array.from({length: 24}, (_, i) => {
        const hour = i < 12 ? i : i - 12;
        const ampm = i < 12 ? 'ص' : 'م';
        return `${hour === 0 ? 12 : hour} ${ampm}`;
    });
    const visitData = data.hourlyVisits.map(v => v.visits);
    charts.hourlyVisits = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: hourLabels,
            datasets: [{
                label: 'الزيارات بالساعة',
                data: visitData,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointBackgroundColor: '#667eea',
                pointBorderColor: 'white',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        font: { size: 12, family: "'Cairo', sans-serif" }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: { family: "'Cairo', sans-serif" }
                    }
                },
                x: {
                    ticks: {
                        font: { family: "'Cairo', sans-serif" }
                    }
                }
            }
        }
    });
}
function createMonthlyVisitsChart(data) {
    if (charts.monthlyVisits) {
        charts.monthlyVisits.destroy();
    }
    const ctx = document.getElementById('monthlyVisitsChart');
    if (!ctx) return;
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const visitData = data.monthlyVisits.map(v => v.visits);
    charts.monthlyVisits = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'إجمالي الزيارات الشهرية',
                data: visitData,
                borderColor: '#764ba2',
                backgroundColor: 'rgba(118, 75, 162, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#764ba2',
                pointBorderColor: 'white',
                pointBorderWidth: 2,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        font: { size: 12, family: "'Cairo', sans-serif" }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: { family: "'Cairo', sans-serif" }
                    }
                },
                x: {
                    ticks: {
                        font: { family: "'Cairo', sans-serif" }
                    }
                }
            }
        }
    });
}
function createDailyAttendanceChart(data) {
    if (charts.dailyAttendance) {
        charts.dailyAttendance.destroy();
    }
    const ctx = document.getElementById('dailyAttendanceChart');
    if (!ctx) return;
    const hourLabels = Array.from({length: 10}, (_, i) => {
        const hour = 8 + i;
        const ampm = hour < 12 ? 'ص' : 'م';
        return `${hour < 12 ? hour : hour - 12} ${ampm}`;
    });
    const attendanceData = data.dailyAttendanceData.map(d => d.present);
    charts.dailyAttendance = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: hourLabels,
            datasets: [{
                label: 'الحضور بالساعة',
                data: attendanceData,
                backgroundColor: '#667eea',
                borderRadius: 8,
                hoverBackgroundColor: '#764ba2',
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        font: { size: 12, family: "'Cairo', sans-serif" }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: { family: "'Cairo', sans-serif" }
                    }
                },
                x: {
                    ticks: {
                        font: { family: "'Cairo', sans-serif" }
                    }
                }
            }
        }
    });
}
function createMonthlyAttendanceChart(data) {
    if (charts.monthlyAttendance) {
        charts.monthlyAttendance.destroy();
    }
    const ctx = document.getElementById('monthlyAttendanceChart');
    if (!ctx) return;
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const attendanceData = data.monthlyAttendanceData.map(d => d.present);
    charts.monthlyAttendance = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'إجمالي الحضور الشهري',
                data: attendanceData,
                borderColor: '#f093fb',
                backgroundColor: 'rgba(240, 147, 251, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#f093fb',
                pointBorderColor: 'white',
                pointBorderWidth: 2,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        font: { size: 12, family: "'Cairo', sans-serif" }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: { family: "'Cairo', sans-serif" }
                    }
                },
                x: {
                    ticks: {
                        font: { family: "'Cairo', sans-serif" }
                    }
                }
            }
        }
    });
}
function redrawCharts() {
    Object.values(charts).forEach(chart => {
        if (chart) chart.resize();
    });
}
function printReport() {
    window.print();
}
