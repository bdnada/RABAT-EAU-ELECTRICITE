import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import styles from "./AgentMapModal.module.css";

// Fix icone Leaflet (sinon marker invisible dans React)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function AgentMapModal({ open, onClose, agent, location }) {
  if (!open) return null;

  const lat = location?.latitude;
  const lng = location?.longitude;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>📍 Position de {agent?.prenom} {agent?.nom}</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {!lat || !lng ? (
          <div className={styles.empty}>Aucune position disponible pour cet agent.</div>
        ) : (
          <div className={styles.mapWrap}>
            <MapContainer
              center={[lat, lng]}
              zoom={16}
              style={{ height: "420px", width: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap"
              />
              <Marker position={[lat, lng]}>
                <Popup>
                  <div>
                    <b>{agent?.prenom} {agent?.nom}</b><br />
                    Lat: {lat}<br />
                    Lng: {lng}<br />
                    {location?.lastUpdate
                      ? `Maj: ${new Date(location.lastUpdate).toLocaleString()}`
                      : ""}
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        )}
      </div>
    </div>
  );
}
