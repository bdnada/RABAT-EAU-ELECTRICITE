import React, { useState, useEffect } from 'react'
import { getReleves } from '../../services/relevesService'
import styles from './RelevesList.module.css'
import ReleveDetailsModal from './ReleveDetailsModal'

const RelevesList = () => {
  const [releves, setReleves] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('ALL') // optionnel

  // ✅ modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedReleves, setSelectedReleves] = useState([])
  const [selectedAdresse, setSelectedAdresse] = useState('')

  useEffect(() => {
    fetchReleves()
  }, [])

  const fetchReleves = async () => {
    try {
      setLoading(true)
      const response = await getReleves()
      setReleves(response.data || [])
    } catch (err) {
      setError('Erreur lors du chargement des relevés')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Grouper par adresse
  const groupedByAddress = releves.reduce((acc, releve) => {
    const adresse = releve.compteur?.adresse?.adresseComplete || 'Adresse inconnue'
    if (!acc[adresse]) acc[adresse] = []
    acc[adresse].push(releve)
    return acc
  }, {})

  // Stats
  const stats = {
    total: releves.length,
    eau: releves.filter(r => r.compteur?.type === 'EAU').length,
    electricite: releves.filter(r => r.compteur?.type === 'ELECTRICITE').length,
    adresses: Object.keys(groupedByAddress).length
  }

  // Filtrer selon recherche et type
  const filteredAddresses = Object.entries(groupedByAddress)
    .filter(([adresse, relevesArray]) => {
      const q = searchTerm.toLowerCase()

      const matchesSearch =
        searchTerm === '' ||
        relevesArray.some(r =>
          (r.compteur?.numeroCompteur || '').toLowerCase().includes(q) ||
          (r.agent?.nom || '').toLowerCase().includes(q) ||
          (r.agent?.prenom || '').toLowerCase().includes(q) ||
          (adresse || '').toLowerCase().includes(q)
        )

      const matchesType =
        filterType === 'ALL' || relevesArray.some(r => r.compteur?.type === filterType)

      return matchesSearch && matchesType
    })
    .sort(([a], [b]) => a.localeCompare(b))

  // ✅ close modal
  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedReleves([])
    setSelectedAdresse('')
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}></div>
        <p className={styles.loadingText}>Chargement des relevés...</p>
      </div>
    )
  }

  return (
    <div className={styles.relevesList}>
      {/* HEADER comme Dashboard */}
      <div className={styles.dashboardHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1>Liste des Relevés</h1>
            <p className={styles.headerSubtitle}>Historique des relevés par adresse</p>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.dateDisplay}>
              {new Date().toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <h3 className={styles.statTitle}>Relevés total</h3>
            <div className={`${styles.statIcon} ${styles.iconStyle} ${styles.iconNotes}`} />
          </div>
          <div className={styles.statBody}>
            <p className={styles.statValue}>{stats.total}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <h3 className={styles.statTitle}>Relevés eau</h3>
            <div className={`${styles.statIcon} ${styles.iconStyle} ${styles.iconWater}`} />
          </div>
          <div className={styles.statBody}>
            <p className={styles.statValue}>{stats.eau}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <h3 className={styles.statTitle}>Relevés électricité</h3>
            <div className={`${styles.statIcon} ${styles.iconStyle} ${styles.iconElec}`} />
          </div>
          <div className={styles.statBody}>
            <p className={styles.statValue}>{stats.electricite}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <h3 className={styles.statTitle}>Adresses</h3>
            <div className={`${styles.statIcon} ${styles.iconStyle} ${styles.iconAddr}`} />
          </div>
          <div className={styles.statBody}>
            <p className={styles.statValue}>{stats.adresses}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className={styles.filtersCard}>
        <input
          type="text"
          placeholder="Rechercher par adresse, numéro de compteur ou agent..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      {/* TABLE */}
      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Adresse</th>
                <th>Compteurs</th>
                <th>Types</th>
                <th>Agents</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredAddresses.length > 0 ? (
                filteredAddresses.map(([adresse, relevesArray]) => {
                  const uniqueTypes = Array.from(
                    new Set(relevesArray.map(r => r.compteur?.type).filter(Boolean))
                  )

                  return (
                    <tr key={adresse}>
                      <td>
                        <div className={styles.addressCell}>{adresse}</div>
                      </td>

                      <td>
                        <div className={styles.compteursList}>
                          {relevesArray.map(r => (
                            <span key={r.id} className={styles.compteurBadge}>
                              {r.compteur?.numeroCompteur || 'N/A'}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td>
                        <div className={styles.typesCell}>
                          {uniqueTypes.map(t => (
                            <span
                              key={t}
                              className={`${styles.badge} ${
                                t === 'EAU' ? styles.badgeEau : styles.badgeElectricite
                              }`}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td>
                        <div className={styles.agentsList}>
                          {[...new Set(relevesArray.map(r => `${r.agent?.prenom} ${r.agent?.nom}`))]
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                      </td>

                      <td>
                        <button
                          className={styles.detailsBtn}
                          onClick={() => {
                            setSelectedReleves(relevesArray)
                            setSelectedAdresse(adresse)
                            setModalOpen(true)
                          }}
                        >
                          Détails
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="5" className={styles.emptyState}>
                    <div className={styles.emptyStateIcon}>📭</div>
                    <p>Aucun relevé trouvé</p>
                    {searchTerm && <small>Essayez avec d'autres critères</small>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ MODAL (OBLIGATOIRE) */}
      <ReleveDetailsModal
        open={modalOpen}
        releves={selectedReleves}
        title={selectedAdresse}
        onClose={handleCloseModal}
      />
    </div>
  )
}

export default RelevesList
