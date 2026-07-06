import React, { useEffect, useRef } from "react";
import L from "leaflet";

// Fix default marker icon paths for CRA
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Coloured pin builder using divIcon
const makePin = (color, label = "") =>
  L.divIcon({
    className: "shiplink-pin",
    html: `<div style="background:${color};color:#fff;font-family:'IBM Plex Sans',sans-serif;font-size:11px;font-weight:600;padding:4px 8px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);border:2px solid #fff;white-space:nowrap;">${label}</div>`,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
  });

const COLOR_BY_TYPE = {
  warehouse: "#002fa7",
  shop: "#ecc94b",
  customer: "#22c55e",
  delivery_partner: "#e53e3e",
  collection_partner: "#6b21a8",
  order: "#0ea5e9",
};

/**
 * MapView – OpenStreetMap via Leaflet (light CartoDB Positron tiles).
 * markers: [{ lat, lng, type, label, popupHtml }]
 */
export default function MapView({ center = [22.9734, 87.7], zoom = 7, markers = [], style }) {
  const container = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  // init map once
  useEffect(() => {
    if (mapRef.current || !container.current) return;
    const map = L.map(container.current, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      { subdomains: "abcd", maxZoom: 19 }
    ).addTo(map);
    L.control.attribution({ prefix: false }).addAttribution("© OpenStreetMap · CARTO").addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    // ensure the map sizes correctly after mount
    setTimeout(() => map.invalidateSize(), 100);
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;
    layerRef.current.clearLayers();
    const bounds = [];
    markers.forEach((m) => {
      if (m.lat == null || m.lng == null) return;
      const color = COLOR_BY_TYPE[m.type] || "#09090b";
      const marker = L.marker([m.lat, m.lng], { icon: makePin(color, m.label || "") });
      if (m.popupHtml) marker.bindPopup(m.popupHtml);
      marker.addTo(layerRef.current);
      bounds.push([m.lat, m.lng]);
    });
    if (bounds.length >= 2) {
      mapRef.current.fitBounds(bounds, { padding: [30, 30] });
    } else if (bounds.length === 1) {
      mapRef.current.setView(bounds[0], Math.max(mapRef.current.getZoom(), 11));
    }
  }, [markers]);

  return (
    <div
      ref={container}
      data-testid="map-view"
      style={{ width: "100%", height: "100%", minHeight: 320, ...(style || {}) }}
    />
  );
}
