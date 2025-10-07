import { store } from './state.js';

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v; else if (k === 'dataset') Object.assign(node.dataset, v); else node.setAttribute(k, v);
  }
  for (const child of children) {
    if (typeof child === 'string') node.appendChild(document.createTextNode(child)); else if (child) node.appendChild(child);
  }
  return node;
}

function renderRow(inst) {
  const row = el('tr', { class: 'row', tabindex: '0' });
  row.addEventListener('click', () => store.selectInstitutionById(inst.id));
  row.addEventListener('keydown', (e) => { if (e.key === 'Enter') store.selectInstitutionById(inst.id); });

  const confChips = el('div', { class: 'chips' }, inst.conferences.slice(0, 3).map(c => el('span', { class: 'chip' }, [c])));

  row.append(
    el('td', {}, [inst.name]),
    el('td', {}, [inst.type]),
    el('td', {}, [inst.country]),
    el('td', { class: 'num' }, [String(inst.publications)]),
    el('td', {}, [confChips])
  );
  return row;
}

export function renderList(institutions) {
  const tbody = document.getElementById('institutionsTbody');
  tbody.innerHTML = '';
  for (const inst of institutions) tbody.appendChild(renderRow(inst));
  document.getElementById('resultCount').textContent = String(institutions.length);
}
