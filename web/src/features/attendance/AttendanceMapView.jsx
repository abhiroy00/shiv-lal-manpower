import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { useSelector } from "react-redux";
import "leaflet/dist/leaflet.css";
import { useGetSitesQuery } from "../deployment/deploymentApi";

const STATUS_COLOR = {
  present: "#15966A",
  late:    "#E8821E",
  review:  "#7B1FA2",
  absent:  "#D2453F",
};

const INDIA_CENTER = [20.5937, 78.9629];

export default function AttendanceMapView() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate]       = useState(today);
  const [site, setSite]       = useState("");
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const accessToken = useSelector((s) => s.auth.accessToken);
  const { data: sitesData } = useGetSitesQuery({});
  const sites = sitesData?.results || sitesData || [];

  const fetchMap = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date });
      if (site) params.set("site", site);
      const res  = await fetch(`/api/attendance/map/?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setMapData(data);
    } catch {
      setMapData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMap(); }, [date, site]);

  const records  = mapData?.records || [];
  const hasCoords = records.length > 0;
  const center   = hasCoords
    ? [records[0].lat, records[0].lng]
    : INDIA_CENTER;

  const statusCount = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={S.wrap}>
      {/* Controls */}
      <div style={S.bar}>
        <div style={S.barLeft}>
          <label style={S.label}>Date</label>
          <input type="date" style={S.input} value={date}
            onChange={(e) => setDate(e.target.value)} max={today} />
        </div>
        <div style={S.barLeft}>
          <label style={S.label}>Site Filter</label>
          <select style={S.input} value={site} onChange={(e) => setSite(e.target.value)}>
            <option value="">All Sites</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div style={S.stats}>
          {Object.entries(statusCount).map(([status, count]) => (
            <span key={status} style={{ ...S.badge, background: STATUS_COLOR[status] + "20", color: STATUS_COLOR[status] }}>
              {status}: {count}
            </span>
          ))}
          {records.length > 0 && (
            <span style={S.total}>Total: {records.length} check-ins</span>
          )}
        </div>
      </div>

      {/* Map */}
      <div style={S.mapWrap}>
        {loading && <div style={S.loading}>Loading check-in locations...</div>}
        {!loading && records.length === 0 && (
          <div style={S.noData}>
            <div style={S.noDataIcon}>📍</div>
            <div style={S.noDataTxt}>No GPS check-ins found for {date}</div>
            <div style={S.noDataSub}>Employees must use the mobile app to check in with GPS</div>
          </div>
        )}

        <MapContainer
          key={date + site}
          center={center}
          zoom={hasCoords ? 13 : 5}
          style={{ width: "100%", height: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {records.map((r) => (
            <CircleMarker
              key={r.id}
              center={[r.lat, r.lng]}
              radius={10}
              pathOptions={{
                fillColor: STATUS_COLOR[r.status] || "#999",
                color:     "#fff",
                weight:    2,
                fillOpacity: 0.9,
              }}
              eventHandlers={{ click: () => setSelected(r) }}
            >
              <Popup>
                <div style={S.popup}>
                  <div style={S.popupName}>{r.full_name}</div>
                  <div style={S.popupCode}>{r.emp_code} · {r.designation}</div>
                  {r.site_name && <div style={S.popupSite}>📍 {r.site_name}</div>}
                  <div style={S.popupRow}>
                    <span style={{ ...S.popupBadge, background: STATUS_COLOR[r.status] }}>
                      {r.status}
                    </span>
                    {r.geofence_ok && <span style={S.geoBadge}>✓ Geofence OK</span>}
                  </div>
                  <div style={S.popupTime}>
                    In: <b>{r.check_in_time?.slice(0, 5) || "—"}</b>
                    {r.check_out_time && <> · Out: <b>{r.check_out_time.slice(0, 5)}</b></>}
                  </div>
                  <div style={S.popupCoords}>
                    {r.lat.toFixed(5)}°N, {r.lng.toFixed(5)}°E
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div style={S.legend}>
        {Object.entries(STATUS_COLOR).map(([status, color]) => (
          <div key={status} style={S.legendItem}>
            <div style={{ ...S.legendDot, background: color }} />
            <span style={S.legendLabel}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
          </div>
        ))}
        <span style={S.legendNote}>Click a dot to see employee details</span>
      </div>
    </div>
  );
}

const S = {
  wrap:      { display: "flex", flexDirection: "column", height: "calc(100vh - 160px)", gap: 12 },
  bar:       { display: "flex", alignItems: "flex-end", gap: 16, background: "#fff", padding: "14px 16px", borderRadius: 12, border: "1px solid #E2E7F0", flexWrap: "wrap" },
  barLeft:   { display: "flex", flexDirection: "column", gap: 4 },
  label:     { fontSize: 11, fontWeight: 700, color: "#6B7793", textTransform: "uppercase" },
  input:     { padding: "8px 10px", border: "1px solid #E2E7F0", borderRadius: 8, fontSize: 13, fontFamily: "inherit" },
  stats:     { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginLeft: "auto" },
  badge:     { display: "inline-flex", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 },
  total:     { fontSize: 13, color: "#6B7793", fontWeight: 600 },
  mapWrap:   { flex: 1, borderRadius: 14, overflow: "hidden", border: "1px solid #E2E7F0", position: "relative", minHeight: 400 },
  loading:   { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.8)", zIndex: 1000, fontSize: 14, color: "#6B7793" },
  noData:    { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 999, pointerEvents: "none" },
  noDataIcon:{ fontSize: 40, marginBottom: 12 },
  noDataTxt: { fontSize: 15, fontWeight: 700, color: "#0F1E3D", marginBottom: 6 },
  noDataSub: { fontSize: 13, color: "#9AA6BF", textAlign: "center" },
  legend:    { display: "flex", gap: 16, alignItems: "center", padding: "10px 16px", background: "#fff", borderRadius: 10, border: "1px solid #E2E7F0" },
  legendItem:{ display: "flex", alignItems: "center", gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendLabel:{ fontSize: 12, color: "#6B7793", fontWeight: 600 },
  legendNote: { fontSize: 11, color: "#9AA6BF", marginLeft: "auto" },
  popup:     { minWidth: 180 },
  popupName: { fontWeight: 700, fontSize: 14, marginBottom: 2 },
  popupCode: { fontSize: 12, color: "#666", marginBottom: 4 },
  popupSite: { fontSize: 12, color: "#1E3563", marginBottom: 6 },
  popupRow:  { display: "flex", gap: 6, alignItems: "center", marginBottom: 6 },
  popupBadge:{ display: "inline-flex", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: "#fff" },
  geoBadge:  { fontSize: 11, color: "#15966A", fontWeight: 600 },
  popupTime: { fontSize: 12, color: "#444", marginBottom: 4 },
  popupCoords:{ fontSize: 10, color: "#999" },
};
