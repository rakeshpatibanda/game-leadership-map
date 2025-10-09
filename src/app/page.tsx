/**
 * src/app/page.tsx
 * -----------------
 * This file is the main client-rendered page for the Game Leadership Map project.
 * It fetches institution data, filters it with a user-friendly sidebar, and visualizes
 * the results on an interactive MapLibre map. Everything from data loading to map
 * lifecycle management happens inside this component.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Defines the shape of each institution record that comes from the JSON feed.
// Optional properties (`country`, `top_authors`) are present for most entries but
// the code defensively handles them being missing or malformed.
type Marker = {
  id: string;
  name: string;
  country?: string; // ISO2
  lat: number;
  lng: number;
  paper_count: number;
  top_authors?: string[];
};

/**
 * Page renders an interactive MapLibre map of research institutions with convenient
 * filtering controls. All map instance setup and lifecycle management happens here.
 */
export default function Page() {
  // `containerRef` points to the <div> that MapLibre will render into.
  // `mapRef` stores the live MapLibre instance so we can interact with it across hooks.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const [allMarkers, setAllMarkers] = useState<Marker[]>([]);
  const [loaded, setLoaded] = useState(false);

  // UI state: the free-text search, the country dropdown, the slider threshold,
  // and whether the filter sidebar is showing on small screens.
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("ALL");
  const [minCount, setMinCount] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load marker data once on mount. After the fetch resolves, store the raw markers and
  // initialize the slider's minimum value so it matches the smallest dataset value.
  // If the request fails, we log the error rather than crashing the page.
  // Load marker data once on mount (now from the DB via API)
  useEffect(() => {
    fetch("/api/markers", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Marker[]) => {
        setAllMarkers(data || []);
        const min = data.length ? Math.min(...data.map((m) => m.paper_count)) : 1;
        setMinCount(Number.isFinite(min) ? Math.max(1, min) : 1);
      })
      .catch((e) => console.error("Failed to load markers:", e));
  }, []);


  // Derive the country dropdown options directly from the loaded markers. This keeps the
  // UI consistent with the data and automatically includes new countries if the dataset grows.
  const countries = useMemo(() => {
    const s = new Set<string>();
    for (const m of allMarkers) if (m.country) s.add(m.country);
    return ["ALL", ...Array.from(s).sort()];
  }, [allMarkers]);

  // Recalculate slider bounds whenever the data changes so the control accurately reflects
  // the real minimum and maximum paper counts present in the dataset.
  const { minPapers, maxPapers } = useMemo(() => {
    if (allMarkers.length === 0) return { minPapers: 1, maxPapers: 1 };
    const min = Math.min(...allMarkers.map((m) => m.paper_count));
    const max = Math.max(...allMarkers.map((m) => m.paper_count));
    return { minPapers: Math.max(1, min), maxPapers: max };
  }, [allMarkers]);

  // Compute the filtered list of markers. We normalize the search text to lower case and
  // check against both the institution name and top authors so partial matches still work.
  // The memo keeps this cheap by recalculating only when the related state changes.
  const markers = useMemo(() => {
    const qlc = q.trim().toLowerCase();
    return allMarkers.filter((m) => {
      if (country !== "ALL" && (m.country || "") !== country) return false;
      if (m.paper_count < minCount) return false;
      if (!qlc) return true;
      const hay =
        (m.name || "").toLowerCase() +
        " " +
        (m.top_authors || []).join(" ").toLowerCase();
      return hay.includes(qlc);
    });
  }, [allMarkers, q, country, minCount]);

  // Turn any list of markers into GeoJSON, the format MapLibre expects for data sources.
  // We only copy the fields that the map layers and popups need.
  const toGeoJSON = (items: Marker[]): GeoJSON.FeatureCollection => ({
    type: "FeatureCollection",
    features: items.map((m) => ({
      type: "Feature",
      properties: {
        id: m.id,
        name: m.name,
        country: m.country || "",
        paper_count: m.paper_count,
        top_authors: m.top_authors || [],
      },
      geometry: { type: "Point", coordinates: [m.lng, m.lat] },
    })),
  });

  // Helper: zoom the visible map region so every marker is framed nicely. For a single
  // marker we jump straight to a reasonable zoom level; for multiple markers we expand
  // a bounding box that encompasses every point and hand that to MapLibre.
  const fitToMarkers = (items: Marker[], pad = 40) => {
    const map = mapRef.current;
    if (!map || items.length === 0) return;
    if (items.length === 1) {
      const m = items[0];
      map.flyTo({ center: [m.lng, m.lat], zoom: 8 });
      return;
    }
    const b = new maplibregl.LngLatBounds();
    for (const m of items) b.extend([m.lng, m.lat]);
    map.fitBounds(b, { padding: pad, duration: 700 });
  };

  /**
   * Initialize the MapLibre instance once there is data and the container is ready.
   * The effect:
   *   1. Creates the map with a base style and mobile-friendly interaction settings.
   *   2. Adds the GeoJSON source and clustering layers.
   *   3. Hooks up event handlers for clicks and cursor feedback.
   *   4. Cleans up by removing the map on unmount or data change.
   */
  useEffect(() => {
    if (!containerRef.current || mapRef.current || allMarkers.length === 0) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [0, 20],
      zoom: 2,
      minZoom: 1,
      maxZoom: 18,
      // Mobile-specific optimizations
      touchZoomRotate: true,
      dragRotate: false,
      pitchWithRotate: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      map.addSource("institutions", {
        type: "geojson",
        data: toGeoJSON(allMarkers) as any,
        cluster: true,
        clusterMaxZoom: 8,
        clusterRadius: 35,
      });

      // Cluster circles render groups of nearby markers. The color and radius scale with
      // the number of institutions inside the cluster so dense regions stand out visually.
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "institutions",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#4C9AFF", 10, "#2684FF", 50, "#0052CC", 100, "#172B4D",
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            15, 10, 20, 50, 25, 100, 30,
          ],
        },
      });

      // Cluster counts overlay the number of institutions on top of each cluster bubble.
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "institutions",
        filter: ["has", "point_count"],
        layout: { "text-field": "{point_count_abbreviated}", "text-size": 12 },
        paint: { "text-color": "#ffffff" },
      });

      // Unclustered points show individual institutions once the map is zoomed in enough
      // that clustering is no longer necessary.
      map.addLayer({
        id: "unclustered",
        type: "circle",
        source: "institutions",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#FF5630",
          "circle-radius": 6,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Clicking a cluster zooms in to reveal the constituent markers. MapLibre calculates
      // the zoom level that will break the cluster apart and we animate the camera there.
      map.on("click", "clusters", (e) => {
        const fs = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        const clusterId = fs[0]?.properties?.cluster_id;
        if (!clusterId) return;
        (map.getSource("institutions") as any).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
          if (err) return;
          map.easeTo({ center: (fs[0].geometry as any).coordinates, zoom });
        });
      });

      // Clicking an individual marker builds a Popup. Because multiple institutions can share
      // nearly identical coordinates, we query a small bounding box and display them together.
      map.on("click", "unclustered", (e) => {
        const pad = 10;
        const bbox: [[number, number], [number, number]] = [
          [e.point.x - pad, e.point.y - pad],
          [e.point.x + pad, e.point.y + pad],
        ];
        const feats = map.queryRenderedFeatures(bbox, { layers: ["unclustered"] });

        // Deduplicate institutions so the popup lists each one only once even if MapLibre
        // returns the same feature multiple times.
        const uniq: any[] = [];
        const seen = new Set<string>();
        for (const f of feats) {
          const id = (f.properties as any)?.id as string;
          if (!id || seen.has(id)) continue;
          seen.add(id);
          uniq.push(f);
        }

        // Safely turn the stored author metadata into a human-friendly snippet. The dataset
        // sometimes ships this value as a JSON string, so we guard against malformed cases.
        const render = (p: any) => {
          let tops: string[] = [];
          if (Array.isArray(p.top_authors)) tops = p.top_authors;
          else if (typeof p.top_authors === "string") {
            try { tops = JSON.parse(p.top_authors); } catch {}
          }
          return `
            <div style="margin:8px 0 10px; padding-bottom:8px; border-bottom:1px solid #eee;">
              <div style="font-weight:600;color:#000;font-size:14px;line-height:1.3">${p.name}</div>
              <div style="color:#333;font-size:12px;margin-top:2px">${p.country || "Unknown"} • ${p.paper_count} papers</div>
              ${tops.length ? `<div style="margin-top:4px;color:#111;font-size:11px;line-height:1.2"><b style="color:#000">Top authors:</b> ${tops.join(", ")}</div>` : ""}
            </div>`;
        };

        let html: string;
        const isMobile = window.innerWidth < 768;
        const maxWidth = isMobile ? '280px' : '320px';
        const padding = isMobile ? '8px 12px' : '10px 14px';
        const fontSize = isMobile ? '12px' : '14px';
        
        if (uniq.length > 1) {
          html = `
            <div style="font-family:system-ui,sans-serif;font-size:${fontSize};color:#111;background:rgba(255,255,255,.97);border-radius:8px;padding:${padding};box-shadow:0 2px 8px rgba(0,0,0,.15);max-width:${maxWidth};line-height:1.4;word-wrap:break-word">
              <div style="font-weight:700;margin-bottom:6px;color:#000;font-size:${isMobile ? '13px' : '14px'}">Institutions here (${uniq.length})</div>
              ${uniq.map(f => render(f.properties)).join("")}
            </div>`;
        } else {
          const p: any = uniq[0]?.properties || e.features?.[0]?.properties || {};
          html = `
            <div style="font-family:system-ui,sans-serif;font-size:${fontSize};color:#111;background:rgba(255,255,255,.96);border-radius:8px;padding:${padding};box-shadow:0 2px 8px rgba(0,0,0,.15);max-width:${maxWidth};line-height:1.4;word-wrap:break-word">
              <div style="font-size:${isMobile ? '14px' : '16px'};font-weight:700;margin-bottom:6px;color:#000">${p.name}</div>
              <div style="font-size:${isMobile ? '11px' : '13px'};color:#333;margin-bottom:8px">${p.country || "Unknown"}</div>
              <div style="font-size:${isMobile ? '11px' : '13px'};margin-bottom:6px"><b style="color:#000">Papers:</b> ${p.paper_count}</div>
              ${render(p)}
            </div>`;
        }
        new Popup().setLngLat(e.lngLat).setHTML(html).addTo(map);
      });

      // Cursor hints for clickable layers improve affordance for new users.
      map.on("mouseenter", "clusters", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "clusters", () => (map.getCanvas().style.cursor = ""));
      map.on("mouseenter", "unclustered", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "unclustered", () => (map.getCanvas().style.cursor = ""));

      setLoaded(true);
    });

    return () => map.remove();
  }, [allMarkers]);

  // Whenever the filtered results change, update the GeoJSON source so the map immediately
  // reflects the new set of institutions.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const src: any = map.getSource("institutions");
    if (!src) return;
    src.setData(toGeoJSON(markers) as any);
  }, [markers, loaded]);

  // Auto-zoom when country or minimum count changes to keep the map centered on relevant
  // markers. A small timeout prevents rapid consecutive updates from feeling jumpy.
  useEffect(() => {
    if (!loaded) return;
    const id = setTimeout(() => fitToMarkers(markers), 150);
    return () => clearTimeout(id);
  }, [country, minCount, loaded]); // run when these change

  // Auto-zoom on single matches to focus the map on that institution immediately.
  useEffect(() => {
    if (!loaded) return;
    if (markers.length === 1) fitToMarkers(markers);
  }, [markers, loaded]);

  // Reset filters back to the dataset defaults.
  const resetFilters = () => {
    setQ("");
    setCountry("ALL");
    setMinCount(minPapers);
  };

  // Handle window resize to collapse the sidebar when jumping from mobile to desktop widths.
  useEffect(() => {
    const handleResize = () => {
      // Close sidebar on mobile when switching to desktop
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main layout includes the responsive sidebar controls and the map canvas.
  return (
    <main className="w-screen h-screen relative">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden absolute top-3 left-3 z-20 p-2 bg-white/95 backdrop-blur rounded-lg shadow-lg border border-gray-200 text-[#111]"
        aria-label="Toggle filter menu"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
          />
        </svg>
      </button>

      {/* Sidebar */}
      <div className={`
        absolute z-10 rounded-xl shadow bg-white/95 backdrop-blur text-[#111]
        ${sidebarOpen ? 'block' : 'hidden md:block'}
        top-3 left-3
        w-[calc(100vw-1.5rem)] max-w-sm md:w-80 md:max-w-none
        max-h-[calc(100vh-1.5rem)] md:max-h-none
        overflow-y-auto
        p-3 md:p-3
      `}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-[#000]">Filter</div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 hover:bg-gray-100 rounded"
            aria-label="Close filter menu"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <label className="block text-xs mb-1 text-[#333]">Search (name or author)</label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. Monash, Mandryk"
          className="w-full mb-3 rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-[#111] bg-white touch-manipulation"
        />

        <label className="block text-xs mb-1 text-[#333]">Country</label>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full mb-3 rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-[#111] bg-white touch-manipulation"
        >
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <label className="block text-xs mb-1 text-[#333]">
          Minimum papers: <span className="font-semibold text-[#000]">{minCount}</span>
        </label>
        <input
          type="range"
          min={minPapers}
          max={maxPapers}
          value={minCount}
          onChange={(e) => setMinCount(parseInt(e.target.value, 10))}
          className="w-full mb-3 touch-manipulation"
        />

        <div className="flex flex-col gap-2 text-xs text-[#333]">
          <div>Showing <b className="text-[#000]">{markers.length}</b> of {allMarkers.length}</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => fitToMarkers(markers)}
              className="flex-1 min-w-[120px] px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-100 text-[#111] touch-manipulation"
              disabled={markers.length === 0}
              title="Zoom the map to the current results"
            >
              Zoom to results
            </button>
            <button
              onClick={resetFilters}
              className="flex-1 min-w-[80px] px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-100 text-[#111] touch-manipulation"
              title="Reset filters"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-5"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Map */}
      <div ref={containerRef} className="w-full h-full touch-manipulation" />
    </main>
  );
}
