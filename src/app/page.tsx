"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type Marker = {
  id: string;
  name: string;
  country?: string; // ISO2
  lat: number;
  lng: number;
  paper_count: number;
  top_authors?: string[];
};

export default function Page() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const [allMarkers, setAllMarkers] = useState<Marker[]>([]);
  const [loaded, setLoaded] = useState(false);

  // UI state
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("ALL");
  const [minCount, setMinCount] = useState(1);

  // Load data
  useEffect(() => {
    fetch("/data/institutions_markers.json")
      .then((r) => r.json())
      .then((data: Marker[]) => {
        setAllMarkers(data);
        const min = Math.min(...data.map((m) => m.paper_count));
        setMinCount(Number.isFinite(min) ? Math.max(1, min) : 1);
      })
      .catch((e) => console.error("Failed to load markers:", e));
  }, []);

  // Country options
  const countries = useMemo(() => {
    const s = new Set<string>();
    for (const m of allMarkers) if (m.country) s.add(m.country);
    return ["ALL", ...Array.from(s).sort()];
  }, [allMarkers]);

  // Slider bounds
  const { minPapers, maxPapers } = useMemo(() => {
    if (allMarkers.length === 0) return { minPapers: 1, maxPapers: 1 };
    const min = Math.min(...allMarkers.map((m) => m.paper_count));
    const max = Math.max(...allMarkers.map((m) => m.paper_count));
    return { minPapers: Math.max(1, min), maxPapers: max };
  }, [allMarkers]);

  // Filtered markers
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

  // Build GeoJSON
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

  // Helper: zoom to markers
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

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current || allMarkers.length === 0) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [0, 20],
      zoom: 2,
      minZoom: 1,
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

      // Cluster circles
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

      // Cluster counts
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "institutions",
        filter: ["has", "point_count"],
        layout: { "text-field": "{point_count_abbreviated}", "text-size": 12 },
        paint: { "text-color": "#ffffff" },
      });

      // Unclustered points
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

      // Cluster → zoom
      map.on("click", "clusters", (e) => {
        const fs = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        const clusterId = fs[0]?.properties?.cluster_id;
        if (!clusterId) return;
        (map.getSource("institutions") as any).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
          if (err) return;
          map.easeTo({ center: (fs[0].geometry as any).coordinates, zoom });
        });
      });

      // Stacked-point popup
      map.on("click", "unclustered", (e) => {
        const pad = 10;
        const bbox: [[number, number], [number, number]] = [
          [e.point.x - pad, e.point.y - pad],
          [e.point.x + pad, e.point.y + pad],
        ];
        const feats = map.queryRenderedFeatures(bbox, { layers: ["unclustered"] });

        const uniq: any[] = [];
        const seen = new Set<string>();
        for (const f of feats) {
          const id = (f.properties as any)?.id as string;
          if (!id || seen.has(id)) continue;
          seen.add(id);
          uniq.push(f);
        }

        const render = (p: any) => {
          let tops: string[] = [];
          if (Array.isArray(p.top_authors)) tops = p.top_authors;
          else if (typeof p.top_authors === "string") {
            try { tops = JSON.parse(p.top_authors); } catch {}
          }
          return `
            <div style="margin:8px 0 10px; padding-bottom:8px; border-bottom:1px solid #eee;">
              <div style="font-weight:600;color:#000">${p.name}</div>
              <div style="color:#333">${p.country || "Unknown"} • ${p.paper_count} papers</div>
              ${tops.length ? `<div style="margin-top:4px;color:#111"><b style="color:#000">Top authors:</b> ${tops.join(", ")}</div>` : ""}
            </div>`;
        };

        let html: string;
        if (uniq.length > 1) {
          html = `
            <div style="font-family:system-ui,sans-serif;font-size:14px;color:#111;background:rgba(255,255,255,.97);border-radius:8px;padding:10px 14px;box-shadow:0 2px 8px rgba(0,0,0,.15);max-width:320px;line-height:1.5">
              <div style="font-weight:700;margin-bottom:6px;color:#000">Institutions here (${uniq.length})</div>
              ${uniq.map(f => render(f.properties)).join("")}
            </div>`;
        } else {
          const p: any = uniq[0]?.properties || e.features?.[0]?.properties || {};
          html = `
            <div style="font-family:system-ui,sans-serif;font-size:14px;color:#111;background:rgba(255,255,255,.96);border-radius:8px;padding:10px 14px;box-shadow:0 2px 8px rgba(0,0,0,.15);max-width:260px;line-height:1.5">
              <div style="font-size:16px;font-weight:700;margin-bottom:6px;color:#000">${p.name}</div>
              <div style="font-size:13px;color:#333;margin-bottom:8px">${p.country || "Unknown"}</div>
              <div style="font-size:13px;margin-bottom:6px"><b style="color:#000">Papers:</b> ${p.paper_count}</div>
              ${render(p)}
            </div>`;
        }
        new Popup().setLngLat(e.lngLat).setHTML(html).addTo(map);
      });

      // Cursor hints
      map.on("mouseenter", "clusters", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "clusters", () => (map.getCanvas().style.cursor = ""));
      map.on("mouseenter", "unclustered", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "unclustered", () => (map.getCanvas().style.cursor = ""));

      setLoaded(true);
    });

    return () => map.remove();
  }, [allMarkers]);

  // Update source on filter change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const src: any = map.getSource("institutions");
    if (!src) return;
    src.setData(toGeoJSON(markers) as any);
  }, [markers, loaded]);

  // Auto-zoom on country/min change
  useEffect(() => {
    if (!loaded) return;
    const id = setTimeout(() => fitToMarkers(markers), 150);
    return () => clearTimeout(id);
  }, [country, minCount, loaded]); // run when these change

  // Auto-zoom when a single result
  useEffect(() => {
    if (!loaded) return;
    if (markers.length === 1) fitToMarkers(markers);
  }, [markers, loaded]);

  // Reset filters
  const resetFilters = () => {
    setQ("");
    setCountry("ALL");
    setMinCount(minPapers);
  };

  return (
    <main className="w-screen h-screen relative">
      {/* Sidebar (colours aligned with popup: dark text on soft white) */}
      <div className="absolute left-3 top-3 z-10 rounded-xl shadow p-3 w-80 bg-white/95 backdrop-blur text-[#111]">
        <div className="text-sm font-semibold mb-2 text-[#000]">Filter</div>

        <label className="block text-xs mb-1 text-[#333]">Search (name or author)</label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. Monash, Mandryk"
          className="w-full mb-3 rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-[#111] bg-white"
        />

        <label className="block text-xs mb-1 text-[#333]">Country</label>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full mb-3 rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-[#111] bg-white"
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
          className="w-full mb-3"
        />

        <div className="flex items-center justify-between text-xs text-[#333]">
          <span>Showing <b className="text-[#000]">{markers.length}</b> of {allMarkers.length}</span>
          <div className="flex gap-2">
            <button
              onClick={() => fitToMarkers(markers)}
              className="text-xs px-3 py-1 rounded-md border border-gray-300 bg-white hover:bg-gray-100 text-[#111]"
              disabled={markers.length === 0}
              title="Zoom the map to the current results"
            >
              Zoom to results
            </button>
            <button
              onClick={resetFilters}
              className="text-xs px-3 py-1 rounded-md border border-gray-300 bg-white hover:bg-gray-100 text-[#111]"
              title="Reset filters"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Map */}
      <div ref={containerRef} className="w-full h-full" />
    </main>
  );
}