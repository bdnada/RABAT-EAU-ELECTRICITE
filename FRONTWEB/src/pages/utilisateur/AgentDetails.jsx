import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getAgentById,
  assignQuartier,
  toggleAgentLoginStatus,
  resetAgentPassword
} from '../../services/api';
import styles from './AgentDetails.module.css';

const AgentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [selectedQuartier, setSelectedQuartier] = useState('');

  const [showAffectPopup, setShowAffectPopup] = useState(false);

  const [showConfirmToggle, setShowConfirmToggle] = useState(false);
  const [toggleToEnable, setToggleToEnable] = useState(true);
  const [showSuccessToggle, setShowSuccessToggle] = useState(false);

  // Reset password states
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showSuccessReset, setShowSuccessReset] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const quartiersList = [
    'Agdal', 'Akkari', 'Ambassadeurs', 'Aviation', 'Centre Ville', 'Diour Jamaa',
    'Douar El Hajja', 'Hay El Fath', 'Hay Nahda', 'Hay Ryad', 'Hassan',
    'Kasbah des Oudayas', 'Kébibat', 'Les Orangers', 'Massira', 'Mabella',
    'Médina', 'Océan', 'Souissi', 'Takaddoum', 'Yacoub El Mansour', 'Youssoufia'
  ].sort();

  useEffect(() => {
    fetchAgent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchAgent = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getAgentById(id);
      const agentData = response.data;
      setAgent(agentData);
      setSelectedQuartier(agentData.quartier || '');
    } catch (err) {
      setError("Erreur lors du chargement de l'agent");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuartier = async (e) => {
    e.preventDefault();
    if (!selectedQuartier.trim()) return;

    try {
      setError('');
      await assignQuartier(id, selectedQuartier.trim());
      setAgent(prev => ({ ...prev, quartier: selectedQuartier.trim() }));
      setIsEditing(false);
      setShowAffectPopup(true);
    } catch (err) {
      setError("Erreur lors de l'affectation du quartier");
    }
  };

  const handleToggleLogin = (enable) => {
    setToggleToEnable(enable);
    setShowConfirmToggle(true);
  };

  const confirmToggle = async () => {
    try {
      setError('');
      await toggleAgentLoginStatus(id, toggleToEnable);
      setAgent(prev => ({ ...prev, loginStatus: toggleToEnable }));
      setShowConfirmToggle(false);
      setShowSuccessToggle(true);
    } catch (err) {
      setError('Erreur lors de la modification du statut de connexion');
    }
  };

  const confirmResetPassword = async () => {
    try {
      setError('');
      setResetLoading(true);
      const res = await resetAgentPassword(id);
      setResetMessage(res?.data || "Mot de passe réinitialisé et email envoyé");
      setShowConfirmReset(false);
      setShowSuccessReset(true);
    } catch (err) {
      setError('Erreur lors de la réinitialisation du mot de passe');
    } finally {
      setResetLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getInitials = (nom, prenom) => {
    return `${(prenom?.[0] || '')}${(nom?.[0] || '')}`.toUpperCase();
  };

  if (loading) return <div className={styles.loading}>Chargement de l'agent...</div>;
  if (!agent) return <div className={styles.errorMessage}>Agent non trouvé</div>;

  return (
    <div className={styles.agentDetails}>
      <div className={styles.pageHeader}>
        <h1>Détails de l'Agent</h1>
        <p>Gestion et informations détaillées</p>
      </div>

      <div className={styles.card}>
        <div className={styles.agentHeader}>
          <div className={styles.agentAvatar}>{getInitials(agent.nom, agent.prenom)}</div>
          <div className={styles.agentHeaderInfo}>
            <h2>{agent.prenom} {agent.nom}</h2>
            <p>ID: {agent.id} • Ajouté le {formatDate(agent.createdAt)}</p>
          </div>
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <h4>Informations Personnelles</h4>
            <div className={styles.infoRow}><label>Nom complet :</label><span>{agent.nom} {agent.prenom}</span></div>
            <div className={styles.infoRow}><label>Date d'ajout :</label><span>{formatDate(agent.createdAt)}</span></div>
          </div>

          <div className={styles.infoCard}>
            <h4>Coordonnées</h4>
            <div className={styles.infoRow}>
              <label>Email :</label>
              <span style={{ color: agent.email ? 'var(--primary)' : 'var(--gray-500)' }}>
                {agent.email || 'Non défini'}
              </span>
            </div>
            <div className={styles.infoRow}>
              <label>Téléphone :</label>
              <span>{agent.telProfessionnel || 'Non défini'}</span>
            </div>
          </div>

          <div className={styles.infoCard}>
            <h4>Informations Professionnelles</h4>
            <div className={styles.infoRow}>
              <label>Quartier :</label>
              <span>{agent.quartier || 'Non affecté'}</span>
            </div>
            <div className={styles.infoRow}>
              <label>Connexion mobile :</label>
              <span className={`${styles.badge} ${agent.loginStatus ? styles.badgeSuccess : styles.badgeDanger}`}>
                {agent.loginStatus ? 'AUTORISÉE' : 'BLOQUÉE'}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Annuler' : 'Modifier Quartier'}
          </button>

          {isEditing && (
            <form onSubmit={handleSubmitQuartier} className={styles.editForm}>
              <select
                value={selectedQuartier}
                onChange={e => setSelectedQuartier(e.target.value)}
                required
              >
                <option value="">-- Sélectionner un quartier --</option>
                {quartiersList.map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
              <button type="submit" className={`${styles.btn} ${styles.btnSuccess}`}>
                Enregistrer
              </button>
            </form>
          )}

          {agent.email && (
            <button
              className={`${styles.btn} ${agent.loginStatus ? styles.btnDanger : styles.btnSuccess}`}
              onClick={() => handleToggleLogin(!agent.loginStatus)}
            >
              {agent.loginStatus ? 'Désactiver connexion' : 'Activer connexion'}
            </button>
          )}

          {/* Nouveau bouton Reset Password */}
          {agent.email && (
            <button
              className={`${styles.btn} ${styles.btnDanger}`}
              onClick={() => setShowConfirmReset(true)}
            >
              Réinitialiser mot de passe
            </button>
          )}

          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => navigate('/user/agents')}
          >
            ← Retour
          </button>
        </div>
      </div>

      {/* Popup Confirmation Toggle Connexion */}
      {showConfirmToggle && (
        <div className={styles.popupOverlay} onClick={() => setShowConfirmToggle(false)}>
          <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
            <h3>Confirmation</h3>
            <p>
              Voulez-vous vraiment {toggleToEnable ? 'activer' : 'désactiver'}
              la connexion mobile de <strong>{agent.prenom} {agent.nom}</strong> ?
            </p>
            <div className={styles.popupActions}>
              <button className={`${styles.btn} ${styles.btnDanger}`} onClick={confirmToggle}>
                {toggleToEnable ? 'Activer' : 'Désactiver'}
              </button>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowConfirmToggle(false)}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Succès Toggle */}
      {showSuccessToggle && (
        <div className={styles.popupOverlay} onClick={() => setShowSuccessToggle(false)}>
          <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
            <h3>Statut modifié</h3>
            <p>La connexion mobile a été {agent.loginStatus ? 'activée' : 'désactivée'} avec succès.</p>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowSuccessToggle(false)}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* Popup Affectation Quartier */}
      {showAffectPopup && (
        <div className={styles.popupOverlay} onClick={() => setShowAffectPopup(false)}>
          <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
            <h3>Quartier affecté !</h3>
            <p>Le quartier a été mis à jour avec succès.</p>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowAffectPopup(false)}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* Popup Confirmation Reset Password */}
      {showConfirmReset && (
        <div className={styles.popupOverlay} onClick={() => !resetLoading && setShowConfirmReset(false)}>
          <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
            <h3>Confirmation</h3>
            <p>
              Voulez-vous vraiment réinitialiser le mot de passe de{' '}
              <strong>{agent.prenom} {agent.nom}</strong> ?
            </p>
            <p style={{ marginTop: 8, color: 'var(--gray-600)' }}>
              Un email sera envoyé à : <strong>{agent.email}</strong>
            </p>
            <div className={styles.popupActions}>
              <button
                className={`${styles.btn} ${styles.btnDanger}`}
                onClick={confirmResetPassword}
                disabled={resetLoading}
              >
                {resetLoading ? 'Réinitialisation...' : 'Réinitialiser'}
              </button>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setShowConfirmReset(false)}
                disabled={resetLoading}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Succès Reset Password */}
      {showSuccessReset && (
        <div className={styles.popupOverlay} onClick={() => setShowSuccessReset(false)}>
          <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
            <h3>Mot de passe réinitialisé</h3>
            <p>{resetMessage || 'Mot de passe réinitialisé et email envoyé'}</p>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowSuccessReset(false)}>
              OK
            </button>
          </div>
        </div>
      )}

      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
};

export default AgentDetails;
