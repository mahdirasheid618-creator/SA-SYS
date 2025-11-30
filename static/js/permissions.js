
function updateVisibility() {
    try {
        // الحصول على بيانات الجلسة
        const session = window.AuthAPI ? window.AuthAPI.getUserSession() : null;
        
        if (!session) {
            console.log('لا توجد جلسة نشطة');
            return;
        }

        const isSupervisor = session.role === 'supervisor';
        const isFullPermissions = session.permissions === 'full';

        console.log(`✓ تحديث الرؤية - الدور: ${session.role}, الصلاحيات: ${session.permissions}`);

        // إظهار/إخفاء عناصر المشرفين فقط
        const supervisorElements = document.querySelectorAll('.supervisor-only');
        supervisorElements.forEach(el => {
            const shouldDisplay = isSupervisor;
            el.style.display = shouldDisplay ? '' : 'none';
        });

        // إظهار إحصائيات المديرين فقط للمشرفين بصلاحيات كاملة
        const managerElements = document.querySelectorAll('.manager-only');
        managerElements.forEach(el => {
            const shouldDisplay = isSupervisor && isFullPermissions;
            el.style.display = shouldDisplay ? '' : 'none';
        });

    } catch (error) {
        console.error('خطأ في تحديث الرؤية:', error);
    }
}

/**
 * إضافة مستمع لتحديث الرؤية عند تحميل DOM
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateVisibility);
} else {
    updateVisibility();
}

// تصدير الدوال
window.PermissionsAPI = {
    updateVisibility,
    getUserSession: () => window.AuthAPI?.getUserSession?.()
};

console.log('✓ تم تحميل نظام إدارة الصلاحيات');
