import { store } from './state.js';

function parseHash() {
  const h = location.hash.replace(/^#/, '');
  if (h.startsWith('institution/')) {
    const id = h.split('/')[1];
    return { route: 'institution', id };
  }
  if (h === 'list') return { route: 'list' };
  return { route: 'map' };
}

export function initRouter() {
  const apply = () => {
    const r = parseHash();
    if (r.route === 'institution' && r.id) {
      store.selectInstitutionById(r.id);
      store.setActiveView('map');
    } else if (r.route === 'list') {
      store.clearSelection();
      store.setActiveView('list');
    } else {
      store.clearSelection();
      store.setActiveView('map');
    }
  };
  window.addEventListener('hashchange', apply);
  apply();
}

export function navigateTo(view) {
  if (view === 'list') location.hash = 'list';
  else if (view === 'map') location.hash = 'map';
}

export function navigateToInstitution(id) {
  location.hash = `institution/${id}`;
}
