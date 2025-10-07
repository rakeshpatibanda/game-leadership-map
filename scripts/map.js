import { store } from './state.js';

let leafletMap = null;
let markerLayer = null;

const TYPE_COLOR = {
  'University': '#5cc8ff',
  'Company': '#7ae582',
  'Research Group': '#c77dff',
};

function createMarker(institution) {
  const color = TYPE_COLOR[institution.type] || '#cccccc';
  const marker = L.circleMarker([institution.latitude, institution.longitude], {
    radius: 7,
    color,
    weight: 2,
    fillColor: color,
    fillOpacity: 0.6,
    opacity: 0.9,
  });

  const popupHtml = `
    <div class="popup">
      <div style="font-weight:600;">${institution.name}</div>
      <div style="color:#9db1d4; font-size:12px;">${institution.city}, ${institution.country}</div>
      <div style="margin-top:6px;">📄 ${institution.publications} publications</div>
      <div style="margin-top:6px;"><a href="#institution/${institution.id}">View details →</a></div>
    </div>
  `;
  marker.bindPopup(popupHtml, { closeButton: true });

  marker.on('click', () => {
    // Keep popup behavior, but also select for the details drawer.
    store.selectInstitutionById(institution.id);
  });

  return marker;
}

export function initMap() {
  if (leafletMap) return;

  leafletMap = L.map('map', {
    worldCopyJump: true,
  }).setView([20, 0], 2);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
  }).addTo(leafletMap);

  markerLayer = L.layerGroup().addTo(leafletMap);
}

export function renderMarkers(institutions) {
  if (!leafletMap || !markerLayer) return;
  markerLayer.clearLayers();

  for (const inst of institutions) {
    if (typeof inst.latitude !== 'number' || typeof inst.longitude !== 'number') continue;
    const m = createMarker(inst);
    markerLayer.addLayer(m);
  }
}

export function focusInstitution(institution) {
  if (!leafletMap || !institution) return;
  leafletMap.setView([institution.latitude, institution.longitude], Math.max(leafletMap.getZoom(), 4), {
    animate: true,
  });
}
