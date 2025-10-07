const DEFAULT_TYPES = ["University", "Company", "Research Group"];

class Store {
  constructor() {
    this.subscribers = new Set();
    this.institutions = [];
    this.filters = {
      searchTerm: '',
      enabledTypes: new Set(DEFAULT_TYPES),
      country: 'All',
      conference: 'All',
      sortKey: 'publications_desc',
    };
    this.selectedInstitutionId = null;
    this.activeView = 'map';
  }

  init(institutions) {
    this.institutions = institutions;
    this.emit();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  emit() {
    for (const cb of this.subscribers) cb(this.getSnapshot());
  }

  getSnapshot() {
    return {
      institutions: this.institutions.slice(),
      filters: { ...this.filters, enabledTypes: new Set(this.filters.enabledTypes) },
      selectedInstitutionId: this.selectedInstitutionId,
      activeView: this.activeView,
    };
  }

  setSearchTerm(term) {
    this.filters.searchTerm = term;
    this.emit();
  }

  setTypeEnabled(type, enabled) {
    if (enabled) this.filters.enabledTypes.add(type); else this.filters.enabledTypes.delete(type);
    this.emit();
  }

  resetFilters() {
    this.filters.searchTerm = '';
    this.filters.enabledTypes = new Set(DEFAULT_TYPES);
    this.filters.country = 'All';
    this.filters.conference = 'All';
    this.filters.sortKey = 'publications_desc';
    this.emit();
  }

  setCountry(country) { this.filters.country = country; this.emit(); }
  setConference(conf) { this.filters.conference = conf; this.emit(); }
  setSortKey(sortKey) { this.filters.sortKey = sortKey; this.emit(); }

  setActiveView(view) { this.activeView = view; this.emit(); }

  selectInstitutionById(id) { this.selectedInstitutionId = id; this.emit(); }
  clearSelection() { this.selectedInstitutionId = null; this.emit(); }

  getSelectedInstitution() { return this.institutions.find(i => i.id === this.selectedInstitutionId) || null; }

  getCountries() {
    const countries = new Set();
    for (const i of this.institutions) countries.add(i.country);
    return Array.from(countries).sort();
  }

  getConferences() {
    const confs = new Set();
    for (const i of this.institutions) for (const c of i.conferences) confs.add(c);
    return Array.from(confs).sort();
  }

  getFilteredInstitutions() {
    const { searchTerm, enabledTypes, country, conference } = this.filters;
    const query = searchTerm.trim().toLowerCase();

    let result = this.institutions.filter(i => enabledTypes.has(i.type));

    if (country !== 'All') {
      result = result.filter(i => i.country === country);
    }
    if (conference !== 'All') {
      result = result.filter(i => i.conferences.includes(conference));
    }
    if (query) {
      result = result.filter(i => {
        const haystack = [
          i.name,
          i.country,
          i.city,
          ...(i.areas || []),
          ...(i.conferences || []),
          ...(i.researchers || []).map(r => r.name),
        ].join(' ').toLowerCase();
        return haystack.includes(query);
      });
    }

    return this.sortInstitutions(result);
  }

  sortInstitutions(insts) {
    const arr = insts.slice();
    const key = this.filters.sortKey;
    const byName = (a, b) => a.name.localeCompare(b.name);
    const byCountry = (a, b) => a.country.localeCompare(b.country);
    const byType = (a, b) => a.type.localeCompare(b.type);
    const byPubs = (a, b) => a.publications - b.publications;

    switch (key) {
      case 'name_asc': arr.sort(byName); break;
      case 'name_desc': arr.sort((a,b)=>byName(b,a)); break;
      case 'country_asc': arr.sort(byCountry); break;
      case 'type_asc': arr.sort(byType); break;
      case 'publications_asc': arr.sort(byPubs); break;
      case 'publications_desc': default: arr.sort((a,b)=>byPubs(b,a)); break;
    }
    return arr;
  }
}

export const store = new Store();
export const TYPES = DEFAULT_TYPES;
