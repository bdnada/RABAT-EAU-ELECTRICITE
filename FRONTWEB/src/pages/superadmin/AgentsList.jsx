import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAgents, createAgentAccount, toggleAgentLoginStatus } from '../../services/api';
import styles from './AgentsListS.module.css';

// Modal simple
const Modal = ({ isOpen, onClose, title, children, onConfirm, confirmText }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        <div className={styles.modalBody}>{children}</div>
        <div className={styles.modalActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>
            Annuler
          </button>
          {onConfirm && (
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onConfirm}>
              {confirmText || 'Confirmer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const AgentsList = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterQuartier, setFilterQuartier] = useState('');

  // Modals
  const [modalConfirmOpen, setModalConfirmOpen] = useState(false);
  const [modalSuccessOpen, setModalSuccessOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalBody, setModalBody] = useState('');
  const [modalConfirmAction, setModalConfirmAction] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await getAgents();
      setAgents(response.data);
    } catch (err) {
      setError('Erreur lors du chargement des agents');
      console.error(err);
    } finally {
      setLoading(false);
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
      'Créer un compte agent',
      `Voulez-vous créer un compte mobile pour ${agent.prenom} ${agent.nom} ?`,
      async () => {
        try {
          await createAgentAccount(agent.id);
          fetchAgents();
          setModalConfirmOpen(false);
          openSuccessModal('Compte créé !', `Le compte mobile de ${agent.prenom} ${agent.nom} a été créé.`);
        } catch (err) {
          setModalConfirmOpen(false);
          openSuccessModal('Erreur', err.response?.data || 'Erreur lors de la création du compte');
        }
      }
    );
  };

  const handleToggleLoginStatus = (agent, enable) => {
    const action = enable ? 'activer' : 'désactiver';
    const actionPast = enable ? 'activée' : 'désactivée';

    openConfirmModal(
      `${enable ? 'Activer' : 'Désactiver'} la connexion`,
      `Voulez-vous ${action} la connexion mobile pour ${agent.prenom} ${agent.nom} ?`,
      async () => {
        try {
          await toggleAgentLoginStatus(agent.id, enable);
          fetchAgents();
          setModalConfirmOpen(false);
          openSuccessModal(
            `Connexion ${actionPast} !`,
            `La connexion mobile de ${agent.prenom} ${agent.nom} a été ${actionPast}.`
          );
        } catch (err) {
          setModalConfirmOpen(false);
          openSuccessModal('Erreur', err.response?.data || `Impossible de ${action} la connexion`);
        }
      }
    );
  };

  // Filtres
  const filteredAgents = agents.filter(agent => {
    const matchesSearch =
      (agent.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (agent.prenom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (agent.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (agent.telProfessionnel || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesQuartier = !filterQuartier || agent.quartier === filterQuartier;

    return matchesSearch && matchesQuartier;
  });

  const quartiers = [...new Set(agents.map(a => a.quartier).filter(Boolean))];

  const getInitials = (nom, prenom) => {
    return `${(prenom?.[0] || '')}${(nom?.[0] || '')}`.toUpperCase();
  };

  if (loading) return <div className={styles.loading}>Chargement des agents...</div>;

  return (
    <div className={styles.agentsList}>
      <div className={styles.pageHeader}>
        <h1>Gestion des Agents</h1>
        <p>Liste des agents de terrain</p>
      </div>

      <div className={`${styles.filters} ${styles.card}`}>
        <input
          type="text"
          placeholder="Rechercher par nom, prénom, email ou téléphone..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <select value={filterQuartier} onChange={e => setFilterQuartier(e.target.value)}>
          <option value="">Tous les quartiers</option>
          {quartiers.map(q => (
            <option key={q} value={q}>{q}</option>
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
                
              </tr>
            </thead>
            <tbody>
              {filteredAgents.length > 0 ? (
                filteredAgents.map(agent => {
                  let statusText = agent.loginStatus ? 'AUTORISÉ' : 'BLOQUÉ';
                  let statusClass = agent.loginStatus ? 'badge-success' : 'badge-danger';

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
                      <td>{agent.email || 'Non défini'}</td>
                      <td>{agent.telProfessionnel || '—'}</td>
                      <td>{agent.quartier || 'Non affecté'}</td>
                      <td>
                        <span className={`${styles.badge} ${styles[statusClass]}`}>
                          {statusText}
                        </span>
                      </td>
                      
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className={styles.emptyState}>
                    <div className={styles.emptyStateIcon}>👤</div>
                    <p>Aucun agent trouvé</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
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
    </div>
  );
};

export default AgentsList;