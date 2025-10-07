import { store, TYPES } from './state.js';
import { renderMarkers, initMap, focusInstitution } from './map.js';
import { renderList } from './list.js';
import { navigateTo } from './router.js';

function setActiveView(view) {
  const mapView = document.getElementById('mapContainer');
  const listView = document.getElementById('listContainer');
  const buttons = document.querySelectorAll('.view-btn');

  if (view === 'list') {
    mapView.classList.add('hidden');
    listView.classList.remove('hidden');
  } else {
    listView.classList.add('hidden');
    mapView.classList.remove('hidden');
  }

  buttons.forEach(b => {
    const isActive = b.dataset.view === view;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function renderDetails(inst) {
  const container = document.getElementById('detailsContent');
  container.innerHTML = '';
  if (!inst) return;

  const badgeClass = inst.type.toLowerCase().replace(/\s+/g, '-');

  const websiteLink = inst.links?.website ? `<a href="${inst.links.website}" target="_blank" rel="noopener">Website</a>` : '';
  container.innerHTML = `
    <h2 style="margin-top:0;">${inst.name}</h2>
    <div class="badge-type ${badgeClass}"><span class="dot"></span>${inst.type}</div>
    <div style="color:#9db1d4; margin-top:6px;">${inst.city}, ${inst.country}</div>
    <div class="kpis">
      <div class="kpi"><div class="value">${inst.publications}</div><div class="label">Publications</div></div>
      <div class="kpi"><div class="value">${inst.researchers.length}</div><div class="label">Researchers</div></div>
      <div class="kpi"><div class="value">${inst.conferences.length}</div><div class="label">Conferences</div></div>
    </div>
    <div class="section"><h3>Top Researchers</h3>
      <ul>
        ${inst.researchers.slice(0,6).map(r=>`<li>${r.name}</li>`).join('')}
      </ul>
    </div>
    <div class="section"><h3>Main Research Areas</h3>
      <div class="chips">${inst.areas.map(a=>`<span class="chip">${a}</span>`).join('')}</div>
    </div>
    <div class="section"><h3>Conferences</h3>
      <div class="chips">${inst.conferences.map(c=>`<span class="chip">${c}</span>`).join('')}</div>
    </div>
    <div class="section"><h3>Links</h3>
      <div>${websiteLink}</div>
    </div>
  `;
}

export function initUI() {
  const mapViewBtn = document.querySelector('.view-btn[data-view="map"]');
  const listViewBtn = document.querySelector('.view-btn[data-view="list"]');
  mapViewBtn.addEventListener('click', () => navigateTo('map'));
  listViewBtn.addEventListener('click', () => navigateTo('list'));

  // Filters
  const typeContainer = document.getElementById('typeFilters');
  typeContainer.innerHTML = '';
  for (const type of TYPES) {
    const id = `type-${type.toLowerCase().replace(/\s+/g,'-')}`;
    const wrapper = document.createElement('label');
    wrapper.className = 'checkbox';
    wrapper.innerHTML = `<input type="checkbox" id="${id}" checked /> <span>${type}</span>`;
    const input = wrapper.querySelector('input');
    input.addEventListener('change', () => store.setTypeEnabled(type, input.checked));
    typeContainer.appendChild(wrapper);
  }

  const countrySelect = document.getElementById('countrySelect');
  const conferenceSelect = document.getElementById('conferenceSelect');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const resetBtn = document.getElementById('resetFiltersBtn');

  function populateDynamicFilters() {
    const countries = store.getCountries();
    const conferences = store.getConferences();

    countrySelect.innerHTML = '<option value="All">All</option>' + countries.map(c=>`<option value="${c}">${c}</option>`).join('');
    conferenceSelect.innerHTML = '<option value="All">All</option>' + conferences.map(c=>`<option value="${c}">${c}</option>`).join('');
  }
  populateDynamicFilters();

  countrySelect.addEventListener('change', () => store.setCountry(countrySelect.value));
  conferenceSelect.addEventListener('change', () => store.setConference(conferenceSelect.value));
  sortSelect.addEventListener('change', () => store.setSortKey(sortSelect.value));

  let searchTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => store.setSearchTerm(searchInput.value), 150);
  });

  resetBtn.addEventListener('click', () => {
    store.resetFilters();
    // Reset UI inputs as well
    searchInput.value = '';
    document.querySelectorAll('#typeFilters input[type="checkbox"]').forEach(cb => cb.checked = true);
    countrySelect.value = 'All';
    conferenceSelect.value = 'All';
    sortSelect.value = 'publications_desc';
  });

  // Details drawer
  const drawer = document.getElementById('detailsDrawer');
  const closeBtn = document.getElementById('closeDetailsBtn');
  closeBtn.addEventListener('click', () => {
    drawer.classList.add('hidden');
    store.clearSelection();
    if (store.activeView !== 'list') location.hash = 'map';
  });

  // Subscribe to state updates to render
  store.subscribe((snapshot) => {
    const list = store.getFilteredInstitutions();

    setActiveView(snapshot.activeView);

    if (snapshot.activeView === 'map') {
      renderMarkers(list);
    } else {
      renderList(list);
    }

    const selected = store.getSelectedInstitution();
    if (selected) {
      drawer.classList.remove('hidden');
      renderDetails(selected);
      focusInstitution(selected);
    } else {
      drawer.classList.add('hidden');
    }
  });

  // Initialize the map once
  initMap();
}
