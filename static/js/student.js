var allStudentsData = [];
var filteredStudentsData = [];
var currentPage = 1; 
const itemsPerPage = 30; 
function initStudents(){
    if (window.FirebaseAPI) {
        if (typeof window.FirebaseAPI.fetchStudents === 'function') {
            window.FirebaseAPI.fetchStudents().then(students => {
                allStudentsData = students.map(s => {
                    const date_added = s.AddedDate && s.AddedDate.toDate ? s.AddedDate.toDate().toISOString() : (s.created_at && s.created_at.toDate ? s.created_at.toDate().toISOString() : (s.AddedDate || s.created_at || null));
                    const date_modified = s.updated_at && s.updated_at.toDate ? s.updated_at.toDate().toISOString() : (s.updated_at || null);
                    return { id: s.id, ...s, date_added, date_modified };
                });
                displayStudents(1);
                updatePagination();
            }).catch(err => {
            });
        }
        if (typeof window.FirebaseAPI.subscribeStudents === 'function') {
            window.FirebaseAPI.subscribeStudents(function(students){
                allStudentsData = students.map(s => {
                    const date_added = s.AddedDate && s.AddedDate.toDate ? s.AddedDate.toDate().toISOString() : (s.created_at && s.created_at.toDate ? s.created_at.toDate().toISOString() : (s.AddedDate || s.created_at || null));
                    const date_modified = s.updated_at && s.updated_at.toDate ? s.updated_at.toDate().toISOString() : (s.updated_at || null);
                    return { id: s.id, ...s, date_added, date_modified };
                });
                displayStudents(1);
                updatePagination();
            });
            return;
        }
    }
    loadStudents();
}
document.addEventListener('DOMContentLoaded', function() {
    if (window.FirebaseReady && typeof window.FirebaseReady.then === 'function') {
        window.FirebaseReady.then(()=> {
            initStudents();
        }).catch((err)=> {
            initStudents();
        });
    } else {
        initStudents();
    }
});
function refreshStudentsTable() {
    const btn = document.getElementById('refreshTableBtn');
    if(btn){ btn.disabled = true; btn.classList.add('loading'); }
    initStudents();
    setTimeout(() => { if(btn){ btn.disabled = false; btn.classList.remove('loading'); } }, 800);
}
function loadStudents() {
    fetch('/api/students')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                allStudentsData = data.students || [];
                displayStudents(1);
                updatePagination();
            } else {
                showError('خطأ في تحميل بيانات الطلاب');
            }
        })
        .catch(error => {
            showError('خطأ في الاتصال بالخادم');
        });
}
function displayStudents(page) {
    let isSupervisor = false;
    let isInstructor = false;
    let permissions = 'full';
    let instructorDepartment = null;
    try{
        const raw = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
        if(raw){ 
            const auth = JSON.parse(raw); 
            isSupervisor = auth && (auth.user_type === 'supervisor' || auth.role === 'supervisor'); 
            isInstructor = auth && (auth.user_type === 'instructor' || auth.role === 'instructor');
            instructorDepartment = auth && (auth.department || auth.dept) ? (auth.department || auth.dept) : null;
            permissions = auth && auth.permissions ? auth.permissions : (auth && auth.permission ? auth.permission : 'full'); 
        }
    }catch(e){}
    
    // إخفاء زر الإضافة للأستاذ والمشرف
    try{ 
        const addBtn = document.getElementById('addStudentBtn'); 
        // hide add button for instructors or supervisors with limited permissions
        if(addBtn) addBtn.style.display = (isInstructor || (isSupervisor && String(permissions).toLowerCase() !== 'full')) ? 'none' : ''; 
    }catch(e){}
    
    // تصفية الطلاب حسب القسم للأستاذ
    let filteredData = allStudentsData;
    if(isInstructor && instructorDepartment) {
        filteredData = allStudentsData.filter(s => {
            const studentDept = s.DepartMent || s.department || s.Department || '';
            return studentDept.toLowerCase() === instructorDepartment.toLowerCase();
        });
    }
    
    // حفظ البيانات المصفاة مؤقتاً للاستخدام في العرض
    const displayData = filteredData;
    filteredStudentsData = filteredData;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = displayData.slice(startIndex, endIndex);
    const tbody = document.getElementById('studentsTableBody');
    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px;">لا توجد بيانات طلاب</td></tr>';
        return;
    }
    tbody.innerHTML = pageData.map((student, index) => {
        const name = student.StudentName || student.full_name || student.FullName || '-' ;
        const dept = student.DepartMent || student.department || student.Department || '-';
        const stage = student.StudentStage || student.stage || student.Stage || '-';
        const phone = student.PhoneNumber || student.phone || student.Phone || '-';
        const age = student.StudentAge || student.age || '-';
        let added = '-';
        if (student.AddedDate && student.AddedDate.toDate) added = new Date(student.AddedDate.toDate()).toLocaleString('ar-EG');
        else if (student.created_at && student.created_at.toDate) added = new Date(student.created_at.toDate()).toLocaleString('ar-EG');
        else if (student.AddedDate) added = new Date(student.AddedDate).toLocaleString('ar-EG');
        const face = student.FaceEncodings ? '[...encodings]' : (student.face_embedding ? '[...encodings]' : '-');
        
        // إخفاء أزرار التعديل والحذف للأستاذ والمشرف ذي صلاحيات محدودة
        let actionsHtml = '';
        const supervisorLimited = isSupervisor && String(permissions).toLowerCase() !== 'full';
        if(isInstructor || supervisorLimited) {
            actionsHtml = '<div class="table-actions"><span style="color: #999;">لا توجد إجراءات</span></div>';
        } else {
            actionsHtml = `
                <div class="table-actions">
                    <button class="btn btn-secondary btn-small" onclick="editStudentRecord('${student.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-small delete-btn" onclick="deleteStudentRecord('${student.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }
        return `
            <tr>
                <td>${startIndex + index + 1}</td>
                <td>${name}</td>
                <td>${dept}</td>
                <td>${stage}</td>
                <td>${phone}</td>
                <td>${age}</td>
                <td>${added}</td>
                <td>${face}</td>
                <td>${actionsHtml}</td>
            </tr>
        `;
    }).join('');
    document.getElementById('totalStudents').textContent = displayData.length;
    renderTabs();
    renderBottomNav();
}
function updatePagination() {
    let filteredData = allStudentsData;
    try {
        const raw = localStorage.getItem('auth_user');
        if(raw) {
            const auth = JSON.parse(raw);
            if(auth && auth.user_type === 'instructor' && auth.department) {
                filteredData = allStudentsData.filter(s => {
                    const studentDept = s.DepartMent || s.department || s.Department || '';
                    return studentDept.toLowerCase() === auth.department.toLowerCase();
                });
            }
        }
    } catch(e) {}
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const container = document.getElementById('paginationContainer');
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML = ''; return; }
    renderTabs();
    renderBottomNav();
}
function renderTabs(){
    const tabsEl = document.getElementById('tabsWrapper');
    if(!tabsEl) return;
    let filteredData = allStudentsData;
    try {
        const raw = localStorage.getItem('auth_user');
        if(raw) {
            const auth = JSON.parse(raw);
            if(auth && auth.user_type === 'instructor' && auth.department) {
                filteredData = allStudentsData.filter(s => {
                    const studentDept = s.DepartMent || s.department || s.Department || '';
                    return studentDept.toLowerCase() === auth.department.toLowerCase();
                });
            }
        }
    } catch(e) {}
    const totalTabs = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
    const blockSize = 10;
    const currentBlock = Math.floor((currentPage - 1) / blockSize);
    const start = currentBlock * blockSize + 1;
    const end = Math.min(start + blockSize - 1, totalTabs);
    let html = `<div class="tabs-row">`;
    if (start > 1) {
        html += `<button class="tab-range-btn" title="السابق 10" onclick="jumpToPrevBlock()"><i class="fas fa-angle-double-left"></i></button>`;
    } else {
        html += `<div style="width:8px"></div>`;
    }
    for(let i=start;i<=end;i++){
        const activeClass = (i === currentPage) ? 'active' : '';
        html += `<button class="tab-btn ${activeClass}" onclick="goToPage(${i})">${i}</button>`;
    }
    if (end < totalTabs) {
        html += `<button class="tab-range-btn" title="التالي 10" onclick="jumpToNextBlock()"><i class="fas fa-angle-double-right"></i></button>`;
    }
    html += `</div>`;
    tabsEl.innerHTML = html;
}
function jumpToPrevBlock(){
    const blockSize = 10;
    const currentBlock = Math.floor((currentPage - 1) / blockSize);
    if(currentBlock <= 0) return;
    const newPage = Math.max(1, (currentBlock - 1) * blockSize + 1);
    goToPage(newPage);
}
function jumpToNextBlock(){
    const blockSize = 10;
    const totalTabs = Math.max(1, Math.ceil(allStudentsData.length / itemsPerPage));
    const currentBlock = Math.floor((currentPage - 1) / blockSize);
    const nextStart = (currentBlock + 1) * blockSize + 1;
    if(nextStart > totalTabs) return;
    goToPage(nextStart);
}
function renderBottomNav(){
    const container = document.getElementById('paginationContainer');
    if(!container) return;
    const totalTabs = Math.max(1, Math.ceil(allStudentsData.length / itemsPerPage));
    const prevDisabled = (currentPage <= 1);
    const nextDisabled = (currentPage >= totalTabs);
    container.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:center; gap:12px;">
            <button class="btn btn-secondary btn-small" onclick="goToPrev()" ${prevDisabled? 'disabled' : ''} title="السابق" style="display:flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:8px;">
                <i class="fas fa-chevron-left"></i>
            </button>
            <div style="padding:8px 14px; border:1px solid #e0e0e0; border-radius:8px; min-width:120px; text-align:center; font-weight:600; background:#fff;">${currentPage} من ${totalTabs}</div>
            <button class="btn btn-secondary btn-small" onclick="goToNext()" ${nextDisabled? 'disabled' : ''} title="التالي" style="display:flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:8px;">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
}
function goToPrev(){ if(currentPage>1) goToPage(currentPage-1); }
function goToNext(){ const total = Math.max(1, Math.ceil(allStudentsData.length / itemsPerPage)); if(currentPage<total) goToPage(currentPage+1); }
function goToPage(page) {
    currentPage = page;
    displayStudents(page);
    updatePagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
function filterTable() {
    const searchValue = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#studentsTableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchValue) ? '' : 'none';
    });
}
function editStudentRecord(id) {
    window.location.href = '/add_student?id=' + id;
}
function deleteStudentRecord(id) {
    const student = allStudentsData.find(s => s.id === id);
    const studentName = student ? (student.full_name || student.StudentName || 'الطالب') : 'الطالب';
    showDeleteModal(studentName, () => {
        if (window.FirebaseAPI && typeof window.FirebaseAPI.deleteStudent === 'function') {
            window.FirebaseAPI.deleteStudent(id).then(() => {
                hideDeleteModal();
            }).catch(err => {
                hideDeleteModal();
                showError('فشل في حذف الطالب');
            });
        } else {
            hideDeleteModal();
            showError('تعذر حذف الطالب: Firebase API غير متاح');
        }
    });
}
function exportToExcel() {
    try {
        const dataToExport = filteredStudentsData.length > 0 ? filteredStudentsData : allStudentsData;
        if (!dataToExport || dataToExport.length === 0) {
            alert('لا توجد بيانات طلاب لتصديرها');
            return;
        }
        const headers = ['التسلسل', 'الاسم', 'القسم', 'المرحلة', 'الهاتف', 'العمر', 'تاريخ الإضافة', 'الوجه'];
        const rows = [];
        dataToExport.forEach((student, index) => {
            const name = student.full_name || student.StudentName || '-';
            const dept = student.department || student.DepartMent || '-';
            const stage = student.stage || student.StudentStage || '-';
            const phone = student.phone || student.PhoneNumber || '-';
            const age = student.age || student.StudentAge || '-';
            let added = '-';
            if (student.created_at && student.created_at.toDate) added = new Date(student.created_at.toDate()).toLocaleString('ar-EG');
            else if (student.AddedDate && student.AddedDate.toDate) added = new Date(student.AddedDate.toDate()).toLocaleString('ar-EG');
            const face = student.face_embedding ? 'نعم' : 'لا';
            rows.push([index + 1, name, dept, stage, phone, age, added, face]);
        });
        if (!window.XLSX) { alert('مكتبة Excel غير محملة. يرجى إعادة تحميل الصفحة'); return; }
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'الطلاب');
        XLSX.writeFile(wb, 'الطلاب.xlsx');
    } catch (err) {
        alert('حدث خطأ أثناء تصدير الملف: ' + err.message);
    }
}
function exportToPDF() {
    function ensureAutoTableLoaded(cb){
        try{
            const hasAuto = (function(){
                try{ const {jsPDF} = window.jspdf || {}; const tmp = jsPDF ? new jsPDF() : null; return tmp && typeof tmp.autoTable === 'function'; }catch(e){return false;}
            })();
            if(hasAuto) return cb();
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.min.js';
            script.onload = () => { setTimeout(cb, 50); };
            script.onerror = () => { alert('تعذر تحميل مكوّن PDF (autoTable). حاول إعادة تحميل الصفحة'); };
            document.head.appendChild(script);
        }catch(e){alert('تعذر تهيئة تصدير PDF'); }
    }
    try {
        const dataToExport = filteredStudentsData.length > 0 ? filteredStudentsData : allStudentsData;
        if (!dataToExport || dataToExport.length === 0) {
            alert('لا توجد بيانات طلاب لتصديرها');
            return;
        }
        if (!window.jspdf || !window.jspdf.jsPDF) { alert('مكتبة PDF غير محملة. يرجى إعادة تحميل الصفحة'); return; }
        ensureAutoTableLoaded(function(){
            try{
                const {jsPDF} = window.jspdf;
                const doc = new jsPDF({orientation: 'p', unit: 'mm', format: 'a4'});
                doc.setFontSize(18);
                doc.setTextColor(44, 62, 80);
                doc.text('قائمة الطلاب المسجلين', 105, 15, { align: 'center' });
                doc.setFontSize(10);
                doc.setTextColor(127, 140, 141);
                const now = new Date().toLocaleString('ar-EG');
                doc.text(`التاريخ: ${now}`, 105, 22, { align: 'center' });
                const headers = ['التسلسل', 'الاسم', 'القسم', 'المرحلة', 'الهاتف', 'العمر', 'تاريخ الإضافة'];
                const rows = [];
                dataToExport.forEach((student, index) => {
                    const name = student.full_name || student.StudentName || '-';
                    const dept = student.department || student.DepartMent || '-';
                    const stage = student.stage || student.StudentStage || '-';
                    const phone = student.phone || student.PhoneNumber || '-';
                    const age = student.age || student.StudentAge || '-';
                    let added = '-';
                    if (student.created_at && student.created_at.toDate) added = new Date(student.created_at.toDate()).toLocaleString('ar-EG');
                    else if (student.AddedDate && student.AddedDate.toDate) added = new Date(student.AddedDate.toDate()).toLocaleString('ar-EG');
                    rows.push([index + 1, name, dept, stage, phone, age, added]);
                });
                if(typeof doc.autoTable !== 'function'){
                    alert('مكوّن الجدول في PDF غير متاح. حاول إعادة تحميل الصفحة');
                    return;
                }
                doc.autoTable({ head: [headers], body: rows, startY: 30, theme: 'grid', styles: { font: 'Arial', fontSize: 9, halign: 'right' }, headStyles: { fillColor: [43, 58, 103], textColor: [255, 255, 255], fontStyle: 'bold' }, alternateRowStyles: { fillColor: [245, 245, 245] } });
                doc.save('الطلاب.pdf');
            }catch(err){alert('حدث خطأ أثناء تصدير الملف: ' + err.message); }
        });
    } catch (err) {
        alert('حدث خطأ أثناء تصدير الملف: ' + err.message);
    }
}
function printStudents() {
    try {
        const dataToExport = filteredStudentsData.length > 0 ? filteredStudentsData : allStudentsData;
        if (!dataToExport || dataToExport.length === 0) {
            alert('لا توجد بيانات طلاب للطباعة');
            return;
        }
        if (!window.jspdf) { alert('مكتبة PDF غير محملة. يرجى إعادة تحميل الصفحة'); return; }
        const {jsPDF} = window.jspdf;
        const doc = new jsPDF({orientation: 'p', unit: 'mm', format: 'a4'});
        doc.setFont(undefined, 'bold');
        doc.setFontSize(20);
        doc.setTextColor(43, 58, 103);
        doc.text('نظام إدارة الطلاب', 105, 15, { align: 'center' });
        doc.setFont(undefined, 'normal');
        doc.setFontSize(14);
        doc.setTextColor(140, 107, 47);
        doc.text('تقرير الطلاب المسجلين', 105, 23, { align: 'center' });
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        const now = new Date().toLocaleString('ar-EG');
        doc.text(`تاريخ التقرير: ${now}`, 20, 32);
        doc.text(`إجمالي الطلاب: ${dataToExport.length}`, 20, 38);
        const headers = ['التسلسل', 'الاسم الثلاثي', 'القسم', 'المرحلة', 'رقم الهاتف', 'العمر', 'تاريخ التسجيل'];
        const rows = [];
        dataToExport.forEach((student, index) => {
            const name = student.full_name || student.StudentName || '-';
            const dept = student.department || student.DepartMent || '-';
            const stage = student.stage || student.StudentStage || '-';
            const phone = student.phone || student.PhoneNumber || '-';
            const age = student.age || student.StudentAge || '-';
            let added = '-';
            if (student.created_at && student.created_at.toDate) added = new Date(student.created_at.toDate()).toLocaleDateString('ar-EG');
            else if (student.AddedDate && student.AddedDate.toDate) added = new Date(student.AddedDate.toDate()).toLocaleDateString('ar-EG');
            rows.push([index + 1, name, dept, stage, phone, age, added]);
        });
        doc.autoTable({ head: [headers], body: rows, startY: 45, theme: 'grid', styles: { font: 'Arial', fontSize: 9, halign: 'right', valign: 'middle' }, headStyles: { fillColor: [43, 58, 103], textColor: [255, 255, 255], fontStyle: 'bold', font: 'Arial' }, alternateRowStyles: { fillColor: [240, 230, 220] }, margin: 15 });
        const pageCount = doc.internal.pages.length - 1;
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text(`الصفحة ${i} من ${pageCount}`, 20, doc.internal.pageSize.getHeight() - 10);
        }
        window.open(doc.output('bloburi'), '_blank');
    } catch (err) {
        alert('حدث خطأ أثناء الطباعة: ' + err.message);
    }
}
function showError(message) {
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px; color: red;">${message}</td></tr>`;
}
let deleteCallback = null;
function showDeleteModal(studentName, onConfirm) {
    deleteCallback = onConfirm;
    const msgEl = document.getElementById('deleteModalMessage');
    if(msgEl) msgEl.textContent = `هل تريد حذف الطالب "${studentName}"؟ هذا الإجراء لا يمكن التراجع عنه.`;
    const modal = document.getElementById('deleteModal');
    if(modal) modal.classList.add('show');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if(confirmBtn) confirmBtn.onclick = function() { if (deleteCallback) deleteCallback(); };
}
function hideDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if(modal) modal.classList.remove('show');
    deleteCallback = null;
}
document.addEventListener('click', function(e) {
    const modal = document.getElementById('deleteModal');
    if (e.target === modal) {
        hideDeleteModal();
    }
});
