import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCompteurs } from '../../services/compteursService'
import styles from './CompteursListS.module.css'

const CompteursList = () => {
  const [compteurs, setCompteurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('ALL')
  const navigate = useNavigate()

  useEffect(() => {
    fetchCompteurs()
  }, [])

  const fetchCompteurs = async () => {
    try {
      setLoading(true)
      const response = await getCompteurs()
      setCompteurs(response.data)
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

  // Calculer les statistiques
  const stats = {
    totalAdresses: adressesList.length,
    totalCompteurs: compteurs.length,
    compteursEau: compteurs.filter(c => c.type === 'EAU').length,
    compteursElectricite: compteurs.filter(c => c.type === 'ELECTRICITE').length
  }

  const filteredAdresses = adressesList.filter(adresse => {
    const matchesSearch =
      adresse.adresse?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adresse.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adresse.quartier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (adresse.compteurEau?.numeroCompteur?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       adresse.compteurElectricite?.numeroCompteur?.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesType = filterType === 'ALL' || 
      (filterType === 'EAU' && adresse.compteurEau) ||
      (filterType === 'ELECTRICITE' && adresse.compteurElectricite) ||
      (filterType === 'BOTH' && adresse.compteurEau && adresse.compteurElectricite) ||
      (filterType === 'INCOMPLETE' && (!adresse.compteurEau || !adresse.compteurElectricite))

    return matchesSearch && matchesType
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
      {/* Header identique au Dashboard */}
      <div className={styles.pageHeader}>
        <h1>Gestion des Compteurs</h1>
        <p>Liste des compteurs installés par adresse</p>
      </div>

      

      {/* Statistiques */}
      <div className={styles.statsSummary}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.totalAdresses}</div>
          <div className={styles.statLabel}>Adresses</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.totalCompteurs}</div>
          <div className={styles.statLabel}>Compteurs</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.compteursEau}</div>
          <div className={styles.statLabel}>Compteurs Eau</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.compteursElectricite}</div>
          <div className={styles.statLabel}>Compteurs Électricité</div>
        </div>
      </div>

      {/* Filtres */}
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

      {/* Tableau */}
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
                      <div style={{ fontWeight: 500 }}>
                        {adresse.adresse}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                        {adresse.quartier}
                      </span>
                    </td>

                    {/* Compteur Eau */}
                    <td>
                      {adresse.compteurEau ? (
                        <div className={styles.compteurCell}>
                          <span className={`${styles.badge} ${styles.badgeEau}`}>
                            EAU
                          </span>
                          <span className={styles.compteurNumber}>
                            {adresse.compteurEau.numeroCompteur}
                          </span>
                        </div>
                      ) : (
                        <span className={styles.noCompteur}>
                          Non installé
                        </span>
                      )}
                    </td>

                    {/* Compteur Électricité */}
                    <td>
                      {adresse.compteurElectricite ? (
                        <div className={styles.compteurCell}>
                          <span className={`${styles.badge} ${styles.badgeElectricite}`}>
                            ÉLECTRICITÉ
                          </span>
                          <span className={styles.compteurNumber}>
                            {adresse.compteurElectricite.numeroCompteur}
                          </span>
                        </div>
                      ) : (
                        <span className={styles.noCompteur}>
                          Non installé
                        </span>
                      )}
                    </td>

                    {/* Index Eau */}
                    <td>
                      {adresse.compteurEau?.indexActuel ? (
                        <span style={{ fontFamily: "'Monaco', 'Consolas', monospace", fontWeight: 600 }}>
                          {adresse.compteurEau.indexActuel.toLocaleString()}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Index Électricité */}
                    <td>
                      {adresse.compteurElectricite?.indexActuel ? (
                        <span style={{ fontFamily: "'Monaco', 'Consolas', monospace", fontWeight: 600 }}>
                          {adresse.compteurElectricite.indexActuel.toLocaleString()}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Dernier Relevé Eau */}
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                        {formatDate(adresse.compteurEau?.dateDerniereReleve)}
                      </span>
                    </td>

                    {/* Dernier Relevé Électricité */}
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
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
                    {searchTerm && (
                      <small>Essayez avec d'autres critères de recherche</small>
                    )}
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