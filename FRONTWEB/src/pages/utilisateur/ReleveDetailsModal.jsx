import React, { useEffect, useMemo } from 'react'
import styles from './ReleveDetailsModal.module.css'

const ReleveDetailsModal = ({ open, releves = [], onClose, title }) => {
  // Close on ESC
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const stats = useMemo(() => {
    const totalReleves = releves.length
    const totalConsommation = releves.reduce((sum, r) => sum + (r.consommation || 0), 0)
    const types = [...new Set(releves.map(r => r.compteur?.type))].filter(Boolean)
    const agents = [...new Set(releves.map(r => `${r.agent?.prenom} ${r.agent?.nom}`))].filter(Boolean)

    const unit = releves[0]?.compteur?.type === 'EAU' ? 'm³' : 'kWh'

    return { totalReleves, totalConsommation, types, agents, unit }
  }, [releves])

  if (!open) return null

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Détails des Relevés</h2>
            <p className={styles.modalSubtitle}>
              {title || releves[0]?.compteur?.adresse?.adresseComplete || 'Adresse inconnue'}
            </p>
          </div>

          <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {/* Summary */}
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Relevés</span>
              <span className={styles.summaryValue}>{stats.totalReleves}</span>
            </div>

            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Consommation totale</span>
              <span className={styles.summaryValue}>
                {stats.totalConsommation.toLocaleString()} {stats.unit}
              </span>
            </div>

            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Types</span>
              <span className={styles.badgesRow}>
                {stats.types.map((t) => (
                  <span
                    key={t}
                    className={`${styles.badge} ${t === 'EAU' ? styles.badgeEau : styles.badgeElectricite}`}
                  >
                    {t}
                  </span>
                ))}
              </span>
            </div>

            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Agents</span>
              <span className={styles.summaryValue}>{stats.agents.length}</span>
            </div>
          </div>

          {/* Table */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th>Type</th>
                  <th>Agent</th>
                  <th>Date</th>
                  <th>Ancien</th>
                  <th>Nouveau</th>
                  <th>Consommation</th>
                </tr>
              </thead>
              <tbody>
                {releves.map((r) => (
                  <tr key={r.id || `${r.dateReleve}-${r.nouvelIndex}`}>
                    <td className={styles.mono}>{r.compteur?.numeroCompteur || 'N/A'}</td>
                    <td>
                      <span className={`${styles.badge} ${r.compteur?.type === 'EAU' ? styles.badgeEau : styles.badgeElectricite}`}>
                        {r.compteur?.type}
                      </span>
                    </td>
                    <td>{r.agent?.prenom} {r.agent?.nom}</td>
                    <td className={styles.muted}>{formatDate(r.dateReleve)}</td>
                    <td className={styles.mono}>{(r.ancienIndex ?? 0).toLocaleString()}</td>
                    <td className={`${styles.mono} ${styles.primary}`}>{(r.nouvelIndex ?? 0).toLocaleString()}</td>
                    <td className={styles.strong}>
                      {(r.consommation ?? 0).toLocaleString()} {r.compteur?.type === 'EAU' ? 'm³' : 'kWh'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button className={styles.secondaryBtn} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReleveDetailsModal
