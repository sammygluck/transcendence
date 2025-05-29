type Routes = Record<string, string>;

const routes: Routes = {
  '/home': 'home',
  '/login': 'loginPage',
  '/tournament': 'tournamentPage',
  '/game' : 'loading',
  '/': 'loading',
  '/404' : 'notFound'
};

function showView(viewId: string | undefined): void {
  document.querySelectorAll<HTMLElement>('.route-view').forEach(el => {
    el.classList.add('hidden');
  });

  if (!viewId) {
    document.body.innerHTML = '<h1>404 - Not Found</h1>';
    return;
  }

  const view = document.getElementById(viewId) as HTMLElement | null;
  if (view) {
    view.classList.remove('hidden');
  } else {
    document.body.innerHTML = '<h1>404 - Not Found</h1>';
  }
}

function handleRouteChange(): void {
  const path = window.location.pathname;
  const viewId = routes[path] || 'notFound';
  showView(viewId);
}

// Delegate click events on links with data-link attribute

document.addEventListener('click', (e: MouseEvent) => {
  const target = e.target as Element;
  const link = target.closest<HTMLElement>('[data-link]');

  if (link) {
    e.preventDefault();
    const href = link.getAttribute('href');
    if (href) {
      history.pushState({}, '', href);
      handleRouteChange();
    }
  }
});

// Handle browser navigation events

window.addEventListener('popstate', handleRouteChange);
window.addEventListener('DOMContentLoaded', handleRouteChange);