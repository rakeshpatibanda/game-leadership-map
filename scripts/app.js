import { loadInstitutions } from './data.js';
import { store } from './state.js';
import { initUI } from './ui.js';
import { initRouter } from './router.js';

async function bootstrap() {
  try {
    const institutions = await loadInstitutions();
    store.init(institutions);
    initUI();
    initRouter();
  } catch (err) {
    const el = document.createElement('pre');
    el.textContent = String(err?.stack || err);
    el.style.color = '#ff9494';
    el.style.padding = '12px';
    document.body.appendChild(el);
  }
}

bootstrap();
