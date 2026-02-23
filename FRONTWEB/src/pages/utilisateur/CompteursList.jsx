import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCompteurs } from '../../services/compteursService'
import styles from './CompteursList.module.css'

const CompteursList = () => {
  const [compteurs, setCompteurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('ALL') // (tu peux l’utiliser plus tard)
  const navigate = useNavigate()

  useEffect(() => {
    fetchCompteurs()
  }, [])

  const fetchCompteurs = async () => {
    try {
      setLoading(true)
      const response = await getCompteurs()
      setCompteurs(response.data || [])
    } catch (err) {
      setError('Erreur lors du chargement des compteurs')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Grouper les compteurs par adresse
  const groupedCompteurs = compteurs.reduce((groups, compteur) => {
    const adresseKey = compteur.adresse?.id || compteur.adresse?.adresseComplete || 'unknown'

    if (!groups[adresseKey]) {
      groups[adresseKey] = {
        id: adresseKey,
        adresse: compteur.adresse?.adresseComplete || 'Adresse inconnue',
        client: `${compteur.adresse?.client?.nom || ''} ${compteur.adresse?.client?.prenom || ''}`.trim(),
        quartier: compteur.adresse?.quartier || 'Non spécifié',
        compteurEau: null,
        compteurElectricite: null
      }
    }

    if (compteur.type === 'EAU') groups[adresseKey].compteurEau = compteur
    if (compteur.type === 'ELECTRICITE') groups[adresseKey].compteurElectricite = compteur

    return groups
  }, {})

  const adressesList = Object.values(groupedCompteurs)

  // Stats
  const stats = {
    totalAdresses: adressesList.length,
    totalCompteurs: compteurs.length,
    compteursEau: compteurs.filter(c => c.type === 'EAU').length,
    compteursElectricite: compteurs.filter(c => c.type === 'ELECTRICITE').length
  }

  // Filtre recherche
  const filteredAdresses = adressesList.filter(adresse => {
    const q = searchTerm.toLowerCase()

    const matchesSearch =
      (adresse.adresse || '').toLowerCase().includes(q) ||
      (adresse.client || '').toLowerCase().includes(q) ||
      (adresse.quartier || '').toLowerCase().includes(q) ||
      ((adresse.compteurEau?.numeroCompteur || '').toLowerCase().includes(q) ||
        (adresse.compteurElectricite?.numeroCompteur || '').toLowerCase().includes(q))

    // filterType pas utilisé pour l’instant (optionnel)
    return matchesSearch
  })

  const formatDate = (dateString) => {
    if (!dateString) return 'Jamais'
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}></div>
        <p className={styles.loadingText}>Chargement des compteurs...</p>
      </div>
    )
  }

  return (
    <div className={styles.compteursList}>
      {/* HEADER (comme Dashboard) */}
      <div className={styles.dashboardHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1>Gestion des Compteurs</h1>
            <p className={styles.headerSubtitle}>Liste des compteurs installés par adresse</p>
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

      {/* ACTIONS */}
      <div className={styles.actionsBar}>
        <div className={styles.actionsLeft}>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => navigate('/user/compteurs/add')}
          >
            + Nouveau Compteur
          </button>
        </div>
      </div>

      {/* STATS (comme Dashboard) */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <h3 className={styles.statTitle}>Adresses</h3>
            <div className={`${styles.statIcon} ${styles.iconAddr}`} />
          </div>
          <p className={styles.statValue}>{stats.totalAdresses}</p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <h3 className={styles.statTitle}>Compteurs</h3>
            <div className={`${styles.statIcon} ${styles.iconMeters}`} />
          </div>
          <p className={styles.statValue}>{stats.totalCompteurs}</p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <h3 className={styles.statTitle}>Compteurs Eau</h3>
            <div className={`${styles.statIcon} ${styles.iconWater}`} />
          </div>
          <p className={styles.statValue}>{stats.compteursEau}</p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <h3 className={styles.statTitle}>Compteurs Électricité</h3>
            <div className={`${styles.statIcon} ${styles.iconElec}`} />
          </div>
          <p className={styles.statValue}>{stats.compteursElectricite}</p>
        </div>
      </div>

      {/* SEARCH */}
      <div className={`${styles.filters} ${styles.card}`}>
        <input
          type="text"
          placeholder="Rechercher par adresse, client, quartier ou numéro..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      {/* TABLE */}
      <div className={styles.card}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Adresse</th>
                <th>Quartier</th>
                <th>Compteur Eau</th>
                <th>Compteur Électricité</th>
                <th>Index Eau</th>
                <th>Index Électricité</th>
                <th>Relevé Eau</th>
                <th>Relevé Électricité</th>
              </tr>
            </thead>

            <tbody>
              {filteredAdresses.length > 0 ? (
                filteredAdresses.map((adresse) => (
                  <tr key={adresse.id}>
                    <td>
                      <div className={styles.addressText}>{adresse.adresse}</div>
                    </td>

                    <td>
                      <span className={styles.mutedSmall}>{adresse.quartier}</span>
                    </td>

                    <td>
                      {adresse.compteurEau ? (
                        <div className={styles.compteurCell}>
                          <span className={`${styles.badge} ${styles.badgeEau}`}>EAU</span>
                          <span className={styles.compteurNumber}>{adresse.compteurEau.numeroCompteur}</span>
                        </div>
                      ) : (
                        <span className={styles.noCompteur}>Non installé</span>
                      )}
                    </td>

                    <td>
                      {adresse.compteurElectricite ? (
                        <div className={styles.compteurCell}>
                          <span className={`${styles.badge} ${styles.badgeElectricite}`}>ÉLECTRICITÉ</span>
                          <span className={styles.compteurNumber}>{adresse.compteurElectricite.numeroCompteur}</span>
                        </div>
                      ) : (
                        <span className={styles.noCompteur}>Non installé</span>
                      )}
                    </td>

                    <td>
                      {adresse.compteurEau?.indexActuel ? (
                        <span className={styles.monoStrong}>
                          {adresse.compteurEau.indexActuel.toLocaleString()}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td>
                      {adresse.compteurElectricite?.indexActuel ? (
                        <span className={styles.monoStrong}>
                          {adresse.compteurElectricite.indexActuel.toLocaleString()}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td>
                      <span className={styles.mutedSmall}>
                        {formatDate(adresse.compteurEau?.dateDerniereReleve)}
                      </span>
                    </td>

                    <td>
                      <span className={styles.mutedSmall}>
                        {formatDate(adresse.compteurElectricite?.dateDerniereReleve)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className={styles.emptyState}>
                    <div className={styles.emptyStateIcon}>📭</div>
                    <p>Aucun compteur trouvé</p>
                    {searchTerm && <small>Essayez avec d'autres critères</small>}
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      </div>
    </div>
  )
}

export default CompteursList
