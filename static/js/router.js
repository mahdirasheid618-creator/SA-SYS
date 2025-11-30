
const Router = {
    currentPage: 'dashboard',
    
    init: function() {
        console.log('[Router] تهيئة نظام التوجيه...');
        this.setupEventListeners();
    },
    
    setupEventListeners: function() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('[data-route]');
            if (link) {
                e.preventDefault();
                const route = link.getAttribute('data-route');
                this.navigate(route);
            }
        });
    },
    
    navigate: function(page) {
        console.log(`[Router] الانتقال إلى: ${page}`);
        this.currentPage = page;
        
        window.history.pushState({ page }, '', `/${page}`);
        
        window.dispatchEvent(new CustomEvent('routeChanged', { detail: { page } }));
    },
    
    getCurrentPage: function() {
        return this.currentPage;
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        Router.init();
    });
} else {
    Router.init();
}
