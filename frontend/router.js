const routes = {
    '/home': 'home',
    '/login': 'loginPage',
    '/tournament': 'tournamentPage',
    '/game': 'loading',
    '/': 'loading',
    '/404': 'notFound'
};
function showView(viewId) {
    document.querySelectorAll('.route-view').forEach(el => {
        el.classList.add('hidden');
    });
    if (!viewId) {
        document.body.innerHTML = '<h1>404 - Not Found</h1>';
        return;
    }
    const view = document.getElementById(viewId);
    if (view) {
        view.classList.remove('hidden');
    }
    else {
        document.body.innerHTML = '<h1>404 - Not Found</h1>';
    }
}
function handleRouteChange() {
    const path = window.location.pathname;
    const viewId = routes[path] || 'notFound';
    showView(viewId);
}
document.addEventListener('click', (e) => {
    const target = e.target;
    const link = target.closest('[data-link]');
    if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) {
            history.pushState({}, '', href);
            handleRouteChange();
        }
    }
});
window.addEventListener('popstate', handleRouteChange);
window.addEventListener('DOMContentLoaded', handleRouteChange);
