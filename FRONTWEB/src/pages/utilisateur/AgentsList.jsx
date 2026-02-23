import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAgents,
  createAgentAccount,
  toggleAgentLoginStatus,
  getAllLatestAgentLocations,
} from "../../services/api";
import styles from "./AgentsList.module.css";

// Leaflet map
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix icone Leaflet (sinon marker invisible)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Modal simple
const Modal = ({ isOpen, onClose, title, children, onConfirm, confirmText }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <div className={styles.modalBody}>{children}</div>
        <div className={styles.modalActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>
            Annuler
          </button>
          {onConfirm && (
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onConfirm}>
              {confirmText || "Confirmer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Modal Carte (1 agent)
const MapModal = ({ isOpen, onClose, agent, location }) => {
  if (!isOpen) return null;

  const lat = location?.latitude;
  const lng = location?.longitude;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        style={{ width: "min(900px, 95vw)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>
          Position de {agent?.prenom} {agent?.nom}
        </h3>

        {!lat || !lng ? (
          <div style={{ padding: 10 }}>Aucune position disponible pour cet agent.</div>
        ) : (
          <div style={{ marginTop: 10 }}>
            <MapContainer
              center={[lat, lng]}
              zoom={16}
              style={{ height: "420px", width: "100%", borderRadius: 10 }}
            >
              {/* ✅ SATELLITE (ESRI) */}
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="Tiles &copy; Esri"
              />
              <Marker position={[lat, lng]}>
                <Popup>
                  <div>
                    <b>
                      {agent?.prenom} {agent?.nom}
                    </b>
                    <br />
                    Lat: {lat}
                    <br />
                    Lng: {lng}
                    <br />
                    {location?.lastUpdate
                      ? `Maj: ${new Date(location.lastUpdate).toLocaleString()}`
                      : ""}
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        )}

        <div className={styles.modalActions} style={{ marginTop: 12 }}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

// ✅ Modal Carte (TOUS les agents) avec Tooltip (nom visible sur marker)
const AllAgentsMapModal = ({ isOpen, onClose, agents, locationsByAgent }) => {
  if (!isOpen) return null;

  const points = (agents || [])
    .map((a) => {
      const loc = locationsByAgent[a.id];
      if (!loc?.latitude || !loc?.longitude) return null;
      return {
        agent: a,
        lat: loc.latitude,
        lng: loc.longitude,
        lastUpdate: loc.lastUpdate,
      };
    })
    .filter(Boolean);

  // Centre: 1er point ou fallback (Casablanca)
  const center = points.length > 0 ? [points[0].lat, points[0].lng] : [33.5731, -7.5898];

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        style={{ width: "min(1100px, 96vw)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Carte — Positions de tous les agents</h3>

        {points.length === 0 ? (
          <div style={{ padding: 10 }}>Aucune position disponible pour le moment.</div>
        ) : (
          <div style={{ marginTop: 10 }}>
            <MapContainer
              center={center}
              zoom={12}
              style={{ height: "520px", width: "100%", borderRadius: 10 }}
            >
              {/* ✅ SATELLITE (ESRI) */}
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="Tiles &copy; Esri"
              />

              {points.map((p) => (
                <Marker key={p.agent.id} position={[p.lat, p.lng]}>
                  {/* ✅ NOM VISIBLE DIRECTEMENT SUR LA CARTE */}
                  <Tooltip direction="top" offset={[0, -10]} permanent>
                    {p.agent?.prenom} {p.agent?.nom}
                  </Tooltip>

                  {/* ✅ Popup sur click */}
                  <Popup>
                    <div>
                      <b>
                        {p.agent?.prenom} {p.agent?.nom}
                      </b>
                      <br />
                      Quartier: {p.agent?.quartier || "—"}
                      <br />
                      Lat: {p.lat}
                      <br />
                      Lng: {p.lng}
                      <br />
                      {p.lastUpdate ? `Maj: ${new Date(p.lastUpdate).toLocaleString()}` : ""}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        <div className={styles.modalActions} style={{ marginTop: 12 }}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

const AgentsList = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterQuartier, setFilterQuartier] = useState("");

  // Locations (REST)
  const [locationsByAgent, setLocationsByAgent] = useState({});

  // Carte 1 agent
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Carte tous les agents
  const [allMapOpen, setAllMapOpen] = useState(false);

  // Modals
  const [modalConfirmOpen, setModalConfirmOpen] = useState(false);
  const [modalSuccessOpen, setModalSuccessOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalBody, setModalBody] = useState("");
  const [modalConfirmAction, setModalConfirmAction] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchAgents();
    fetchLocations();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await getAgents();
      setAgents(response.data);
    } catch (err) {
      setError("Erreur lors du chargement des agents");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await getAllLatestAgentLocations();
      const map = {};
      for (const loc of res.data || []) {
        const agentId = loc?.agent?.id ?? loc?.agentId;
        if (agentId != null) map[agentId] = loc;
      }
      setLocationsByAgent(map);
    } catch (e) {
      console.warn("Impossible de charger les localisations", e);
    }
  };

  // === Gestion Modals ===
  const openConfirmModal = (title, body, onConfirm) => {
    setModalTitle(title);
    setModalBody(body);
    setModalConfirmAction(() => onConfirm);
    setModalConfirmOpen(true);
  };

  const openSuccessModal = (title, body) => {
    setModalTitle(title);
    setModalBody(body);
    setModalSuccessOpen(true);
  };

  // === Actions ===
  const handleCreateAccountClick = (agent) => {
    openConfirmModal(
      "Créer un compte agent",
      `Voulez-vous créer un compte mobile pour ${agent.prenom} ${agent.nom} ?`,
      async () => {
        try {
          await createAgentAccount(agent.id);
          await fetchAgents();
          setModalConfirmOpen(false);
          openSuccessModal(
            "Compte créé !",
            `Le compte mobile de ${agent.prenom} ${agent.nom} a été créé.`
          );
        } catch (err) {
          setModalConfirmOpen(false);
          openSuccessModal("Erreur", err.response?.data || "Erreur lors de la création du compte");
        }
      }
    );
  };

  const handleToggleLoginStatus = (agent, enable) => {
    const action = enable ? "activer" : "désactiver";
    const actionPast = enable ? "activée" : "désactivée";

    openConfirmModal(
      `${enable ? "Activer" : "Désactiver"} la connexion`,
      `Voulez-vous ${action} la connexion mobile pour ${agent.prenom} ${agent.nom} ?`,
      async () => {
        try {
          await toggleAgentLoginStatus(agent.id, enable);
          await fetchAgents();
          setModalConfirmOpen(false);
          openSuccessModal(
            `Connexion ${actionPast} !`,
            `La connexion mobile de ${agent.prenom} ${agent.nom} a été ${actionPast}.`
          );
        } catch (err) {
          setModalConfirmOpen(false);
          openSuccessModal("Erreur", err.response?.data || `Impossible de ${action} la connexion`);
        }
      }
    );
  };

  // Filtres
  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      (agent.nom || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (agent.prenom || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (agent.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (agent.telProfessionnel || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesQuartier = !filterQuartier || agent.quartier === filterQuartier;
    return matchesSearch && matchesQuartier;
  });

  const quartiers = [...new Set(agents.map((a) => a.quartier).filter(Boolean))];
  const getInitials = (nom, prenom) => `${(prenom?.[0] || "")}${(nom?.[0] || "")}`.toUpperCase();

  const renderTime = (agentId) => {
    const loc = locationsByAgent[agentId];
    return loc?.lastUpdate ? new Date(loc.lastUpdate).toLocaleString() : "—";
  };

  if (loading) return <div className={styles.loading}>Chargement des agents...</div>;

  return (
    <div className={styles.agentsList}>
      <div className={styles.pageHeader}>
        <h1>Gestion des Agents</h1>
        <p>Liste des agents de terrain</p>

        <div style={{ marginTop: 8, display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={fetchLocations}>
            Rafraîchir positions
          </button>

          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setAllMapOpen(true)}>
            Carte
          </button>
        </div>
      </div>

      <div className={`${styles.filters} ${styles.card}`}>
        <input
          type="text"
          placeholder="Rechercher par nom, prénom, email ou téléphone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select value={filterQuartier} onChange={(e) => setFilterQuartier(e.target.value)}>
          <option value="">Tous les quartiers</option>
          {quartiers.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.card}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Quartier</th>
                <th>Statut connexion</th>
                <th>Dernière position</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAgents.length > 0 ? (
                filteredAgents.map((agent) => {
                  const statusText = agent.loginStatus ? "AUTORISÉ" : "BLOQUÉ";
                  const statusClass = agent.loginStatus ? "badge-success" : "badge-danger";

                  const loc = locationsByAgent[agent.id];

                  return (
                    <tr key={agent.id}>
                      <td>
                        <div className={styles.agentRow}>
                          <div className={styles.agentAvatar}>
                            {getInitials(agent.nom, agent.prenom)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>
                              {agent.prenom} {agent.nom}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>{agent.email || "Non défini"}</td>
                      <td>{agent.telProfessionnel || "—"}</td>
                      <td>{agent.quartier || "Non affecté"}</td>

                      <td>
                        <span className={`${styles.badge} ${styles[statusClass]}`}>
                          {statusText}
                        </span>
                      </td>

                      <td>{renderTime(agent.id)}</td>

                      <td>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <button
                            className={`${styles.btn} ${styles.btnSecondary}`}
                            disabled={!loc}
                            onClick={() => {
                              setSelectedAgent(agent);
                              setMapOpen(true);
                            }}
                          >
                            Carte
                          </button>

                          {!agent.email ? (
                            <button
                              className={`${styles.btn} ${styles.btnSuccess}`}
                              onClick={() => handleCreateAccountClick(agent)}
                            >
                              Créer compte
                            </button>
                          ) : agent.loginStatus ? (
                            <>
                              <button
                                className={`${styles.btn} ${styles.btnPrimary}`}
                                onClick={() => navigate(`/user/agents/${agent.id}`)}
                              >
                                Détails
                              </button>
                              <button
                                className={`${styles.btn} ${styles.btnDanger}`}
                                onClick={() => handleToggleLoginStatus(agent, false)}
                              >
                                Désactiver
                              </button>
                            </>
                          ) : (
                            <button
                              className={`${styles.btn} ${styles.btnSuccess}`}
                              onClick={() => handleToggleLoginStatus(agent, true)}
                            >
                              Activer connexion
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className={styles.emptyState}>
                    <div className={styles.emptyStateIcon}>👤</div>
                    <p>Aucun agent trouvé</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={modalConfirmOpen}
        onClose={() => setModalConfirmOpen(false)}
        title={modalTitle}
        onConfirm={modalConfirmAction}
        confirmText="Confirmer"
      >
        {modalBody}
      </Modal>

      <Modal
        isOpen={modalSuccessOpen}
        onClose={() => setModalSuccessOpen(false)}
        title={modalTitle}
        onConfirm={() => setModalSuccessOpen(false)}
        confirmText="OK"
      >
        {modalBody}
      </Modal>

      <MapModal
        isOpen={mapOpen}
        onClose={() => setMapOpen(false)}
        agent={selectedAgent}
        location={selectedAgent ? locationsByAgent[selectedAgent.id] : null}
      />

      <AllAgentsMapModal
        isOpen={allMapOpen}
        onClose={() => setAllMapOpen(false)}
        agents={agents}
        locationsByAgent={locationsByAgent}
      />
    </div>
  );
};

export default AgentsList;
