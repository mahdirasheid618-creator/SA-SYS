const supportsLocalStorage = () => {
    try {
        const test = '__localstorage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch(e) {
        return false;
    }
};
function showSuccess(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success';
    alertDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.body.insertBefore(alertDiv, document.body.firstChild);
    setTimeout(() => {
        alertDiv.remove();
    }, 4000);
}
function showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger';
    alertDiv.innerHTML = `<i class="fas fa-times-circle"></i> ${message}`;
    document.body.insertBefore(alertDiv, document.body.firstChild);
    setTimeout(() => {
        alertDiv.remove();
    }, 4000);
}
function showWarning(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-warning';
    alertDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    document.body.insertBefore(alertDiv, document.body.firstChild);
    setTimeout(() => {
        alertDiv.remove();
    }, 4000);
}
function showInfo(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-info';
    alertDiv.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    document.body.insertBefore(alertDiv, document.body.firstChild);
    setTimeout(() => {
        alertDiv.remove();
    }, 4000);
}
function formatDateArabic(date) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('ar-EG', options);
}
function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}
function getYesterdayDate() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
}
function compressImage(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const maxWidth = 1000;
            const maxHeight = 1000;
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}
function filterData(searchTerm, dataArray, keys) {
    if (!searchTerm) return dataArray;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return dataArray.filter(item => {
        return keys.some(key => {
            const value = item[key];
            return value && value.toString().toLowerCase().includes(lowerSearchTerm);
        });
    });
}
function searchInTable(tableId, searchInputId) {
    const searchInput = document.getElementById(searchInputId);
    const table = document.getElementById(tableId);
    if (!searchInput || !table) return;
    searchInput.addEventListener('keyup', function() {
        const searchValue = this.value.toLowerCase();
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchValue) ? '' : 'none';
        });
    });
}
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
function isValidPhone(phone) {
    const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{7,}$/;
    return phoneRegex.test(phone);
}
function getFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};
    const formData = new FormData(form);
    const data = {};
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    return data;
}
function resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
    }
}
function saveToLocalStorage(key, value) {
    if (supportsLocalStorage()) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch(e) {
            return false;
        }
    }
    return false;
}
function getFromLocalStorage(key) {
    if (supportsLocalStorage()) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch(e) {
            return null;
        }
    }
    return null;
}
function removeFromLocalStorage(key) {
    if (supportsLocalStorage()) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch(e) {
            return false;
        }
    }
    return false;
}
function clearLocalStorage() {
    if (supportsLocalStorage()) {
        try {
            localStorage.clear();
            return true;
        } catch(e) {
            return false;
        }
    }
    return false;
}
async function apiCall(url, options = {}) {
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    const finalOptions = { ...defaultOptions, ...options };
    try {
        const response = await fetch(url, finalOptions);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        throw error;
    }
}
async function apiGet(url) {
    return apiCall(url, { method: 'GET' });
}
async function apiPost(url, data) {
    return apiCall(url, {
        method: 'POST',
        body: JSON.stringify(data)
    });
}
async function apiPut(url, data) {
    return apiCall(url, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}
async function apiDelete(url) {
    return apiCall(url, { method: 'DELETE' });
}
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showSuccess('تم نسخ النص بنجاح');
    }).catch(err => {
        showError('فشل نسخ النص');
    });
}
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
function toCamelCase(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
}
function toBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value === '1';
    }
    return Boolean(value);
}
if (typeof Object.assign !== 'function') {
    Object.defineProperty(Object, 'assign', {
        value: function assign(target) {
            if (target === null || target === undefined) {
                throw new TypeError('Cannot convert undefined or null to object');
            }
            const to = Object(target);
            for (let index = 1; index < arguments.length; index++) {
                const nextSource = arguments[index];
                if (nextSource !== null && nextSource !== undefined) {
                    for (const nextKey in nextSource) {
                        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                            to[nextKey] = nextSource[nextKey];
                        }
                    }
                }
            }
            return to;
        },
        writable: true,
        configurable: true
    });
}
document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && currentPath.includes(href)) {
            link.classList.add('active');
        }
    });
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    if (tooltipTriggerList.length > 0 && typeof bootstrap !== 'undefined') {
    }
    
    // تهيئة الـ Router
    console.log('[Main] تهيئة Router...');
    if (window.RouteHandler && typeof window.RouteHandler.loadPage === 'function') {
        const path = window.location.pathname;
        console.log(`[Main] تحميل المسار: ${path}`);
        window.RouteHandler.loadPage(path);
    } else {
        console.warn('[Main] RouteHandler غير متاح');
    }
});
document.addEventListener('DOMContentLoaded', function(){
    try{
        if (window.FirebaseReady && typeof window.FirebaseReady.then === 'function'){
            window.FirebaseReady.then(api => {
                try{
                    if (!api || typeof api.addVisitor !== 'function') return;
                    api.addVisitor({
                        page: document.title || window.location.pathname,
                        path: window.location.pathname + window.location.search,
                        user_agent: navigator.userAgent || '',
                        meta: { event: 'page_load' }
                    }).then(id => {
                    }).catch(err => {
                    });
                }catch(err){}
            }).catch(err => {
            });
        }
    }catch(e){
    }
});
if (window.location.protocol === 'https:' && !supportsLocalStorage()) {
}
