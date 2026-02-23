import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import './ReleveHistoriqueList.css'

const ReleveHistoriqueList = () => {
  const [historique, setHistorique] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [moisFilter, setMoisFilter] = useState('')
  const [quartierFilter, setQuartierFilter] = useState('')

  const [moisDisponibles, setMoisDisponibles] = useState([])
  const [quartiersDisponibles, setQuartiersDisponibles] = useState([])

  const [stats, setStats] = useState({
    totalAdresses: 0,
    eau: 0,
    electricite: 0,
    quartiers: 0
  })

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatMois = (moisAnnee) => {
    if (!moisAnnee) return '-'
    const [year, month] = moisAnnee.split('-')
    const date = new Date(year, month - 1)
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  }

  const getCurrentDate = () =>
    new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

  // ✅ pick helper
  const pick = (obj, keys, fallback = 'N/A') => {
    for (const k of keys) {
      const v = obj?.[k]
      if (v !== undefined && v !== null && v !== '') return v
    }
    return fallback
  }

  const num = (v, fallback = '0') => {
    if (v === undefined || v === null || v === '') return fallback
    return String(v)
  }

  const renderEauCell = (row) => {
    const ancien = pick(row, ['ancienIndexEau', 'ancienIndexEAU', 'ancien_index_eau'], null)
    const nouveau = pick(row, ['nouvelIndexEau', 'nouvelIndexEAU', 'nouvel_index_eau'], null)
    const conso = pick(row, ['consommationEau', 'consoEau', 'consommation_eau'], null)

    return (
      <div className="compteurCell">
        <div className="compteurRow">
          <span className="compteurLabel">Ancien</span>
          <span className="compteurValue">{num(ancien, '0')}</span>
        </div>

        <div className="compteurRow">
          <span className="compteurLabel">Nouveau</span>
          <span className="compteurValue">{num(nouveau, '0')}</span>
        </div>

        <div className="compteurRow">
          <span className="compteurLabel">Conso</span>
          <span className="compteurValue">
            {conso === null ? '0 m³' : `${num(conso, '0')} m³`}
          </span>
        </div>
      </div>
    )
  }

  const renderElecCell = (row) => {
    const ancien = pick(row, ['ancienIndexElectricite', 'ancienIndexElectricité', 'ancien_index_elec'], null)
    const nouveau = pick(row, ['nouvelIndexElectricite', 'nouvelIndexElectricité', 'nouvel_index_elec'], null)
    const conso = pick(row, ['consommationElectricite', 'consommationElectricité', 'consoElec', 'consommation_elec'], null)

    return (
      <div className="compteurCell">
        <div className="compteurRow">
          <span className="compteurLabel">Ancien</span>
          <span className="compteurValue">{num(ancien, '0')}</span>
        </div>

        <div className="compteurRow">
          <span className="compteurLabel">Nouveau</span>
          <span className="compteurValue">{num(nouveau, '0')}</span>
        </div>

        <div className="compteurRow">
          <span className="compteurLabel">Conso</span>
          <span className="compteurValue">
            {conso === null ? '0 kWh' : `${num(conso, '0')} kWh`}
          </span>
        </div>
      </div>
    )
  }

  // ✅ Detect si un item contient EAU / ELEC (pour merge correct)
  const hasEau = (item) =>
    item?.ancienIndexEau != null ||
    item?.nouvelIndexEau != null ||
    item?.ancienIndexEAU != null ||
    item?.nouvelIndexEAU != null ||
    item?.consommationEau != null ||
    item?.consoEau != null

  const hasElec = (item) =>
    item?.ancienIndexElectricite != null ||
    item?.nouvelIndexElectricite != null ||
    item?.consommationElectricite != null ||
    item?.consoElec != null

  // ✅ Merge helper: ne remplace pas une valeur déjà existante par null/undefined
  const mergePreferValue = (base, incoming, keys) => {
    keys.forEach((k) => {
      const v = incoming?.[k]
      if (v !== undefined && v !== null && v !== '') {
        base[k] = v
      }
    })
  }

  // ✅ FUSION: 2 relevés -> 1 seule ligne par adresse + mois
  const mergeRowsByAdresseAndMonth = (rows) => {
    const map = new Map()

    rows.forEach((item) => {
      const adresse = item?.adresseComplete || item?.adresse || 'Adresse inconnue'
      const mois = item?.moisAnnee || item?.mois || ''
      const quartier = item?.quartier || ''
      // clé: adresse + mois (et quartier pour éviter collision si besoin)
      const key = `${adresse}__${mois}__${quartier}`

      if (!map.has(key)) {
        // clone initial
        map.set(key, { ...item, adresseComplete: adresse, moisAnnee: item?.moisAnnee || mois })
        return
      }

      const base = map.get(key)

      // On garde la dateArchivage la plus récente
      const baseDate = base?.dateArchivage ? new Date(base.dateArchivage).getTime() : 0
      const newDate = item?.dateArchivage ? new Date(item.dateArchivage).getTime() : 0
      if (newDate > baseDate) base.dateArchivage = item.dateArchivage

      // Agent: si base vide, prends celui du nouveau
      if ((!base.agentNom && !base.agentPrenom) && (item.agentNom || item.agentPrenom)) {
        base.agentNom = item.agentNom
        base.agentPrenom = item.agentPrenom
      }

      // ✅ Fusion des champs EAU
      if (hasEau(item)) {
        mergePreferValue(base, item, [
          'ancienIndexEau', 'ancienIndexEAU', 'ancien_index_eau',
          'nouvelIndexEau', 'nouvelIndexEAU', 'nouvel_index_eau',
          'consommationEau', 'consoEau', 'consommation_eau'
        ])
      }

      // ✅ Fusion des champs ELEC
      if (hasElec(item)) {
        mergePreferValue(base, item, [
          'ancienIndexElectricite', 'ancienIndexElectricité', 'ancien_index_elec',
          'nouvelIndexElectricite', 'nouvelIndexElectricité', 'nouvel_index_elec',
          'consommationElectricite', 'consommationElectricité', 'consoElec', 'consommation_elec'
        ])
      }

      map.set(key, base)
    })

    return Array.from(map.values())
  }

  const fetchHistorique = async () => {
    try {
      setLoading(true)
      setError('')

      let url = '/releves/historique'
      const params = new URLSearchParams()
      if (moisFilter) params.append('mois', moisFilter)
      if (quartierFilter) params.append('quartier', quartierFilter)
      if (params.toString()) url += `?${params.toString()}`

      const response = await api.get(url)
      const data = response.data || []

      console.log('✅ HISTORIQUE API DATA (first row):', data?.[0])

      // ✅ Fusion EAU+ELEC sur une seule ligne
      const mergedData = mergeRowsByAdresseAndMonth(data)

      // ✅ Liste des filtres depuis mergedData (pour éviter doublons)
      const moisSet = new Set()
      const quartierSet = new Set()

      mergedData.forEach((item) => {
        if (item.moisAnnee) moisSet.add(item.moisAnnee)
        if (item.quartier) quartierSet.add(item.quartier)
      })

      setMoisDisponibles([...moisSet].sort().reverse())
      setQuartiersDisponibles([...quartierSet].sort())

      setHistorique(mergedData)

      // ✅ stats
      const totalAdresses = mergedData.length
      const eau = mergedData.filter((r) => hasEau(r)).length
      const electricite = mergedData.filter((r) => hasElec(r)).length
      const quartiers = new Set(mergedData.map((r) => r.quartier).filter(Boolean)).size

      setStats({ totalAdresses, eau, electricite, quartiers })
    } catch (err) {
      console.error(err)
      setError("Erreur lors du chargement de l'historique des relevés")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistorique()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moisFilter, quartierFilter])

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p className="loading-text">Chargement de l'historique...</p>
      </div>
    )
  }

  return (
    <div className="releve-historique">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Historique des relevés (par adresse)</h1>
            <p className="header-subtitle">Consultation des relevés archivés</p>
          </div>
          <div className="header-right">
            <div className="date-display">{getCurrentDate()}</div>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header"><h3 className="stat-title">Adresses</h3></div>
          <div className="stat-body">
            <div className="stat-value">{stats.totalAdresses}</div>
            <div className="stat-label">adresses archivées</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header"><h3 className="stat-title">Compteurs Eau</h3></div>
          <div className="stat-body">
            <div className="stat-value">{stats.eau}</div>
            <div className="stat-label">EAU présents</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header"><h3 className="stat-title">Compteurs Électricité</h3></div>
          <div className="stat-body">
            <div className="stat-value">{stats.electricite}</div>
            <div className="stat-label">ÉLECTRICITÉ présents</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header"><h3 className="stat-title">Quartiers</h3></div>
          <div className="stat-body">
            <div className="stat-value">{stats.quartiers}</div>
            <div className="stat-label">quartiers couverts</div>
          </div>
        </div>
      </div>

      <div className="filters-section">
        <div className="filter-card">
          <h3>Filtres de recherche</h3>
          {error && <div className="error-message">{error}</div>}

          <div className="filter-grid">
            <div className="filter-group">
              <label>Mois</label>
              <select value={moisFilter} onChange={(e) => setMoisFilter(e.target.value)} className="form-control">
                <option value="">Tous les mois</option>
                {moisDisponibles.map((mois) => (
                  <option key={mois} value={mois}>{formatMois(mois)}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Quartier</label>
              <select value={quartierFilter} onChange={(e) => setQuartierFilter(e.target.value)} className="form-control">
                <option value="">Tous les quartiers</option>
                {quartiersDisponibles.map((quartier) => (
                  <option key={quartier} value={quartier}>{quartier}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Actions</label>
              <div className="filter-actions">
                <button
                  onClick={() => { setMoisFilter(''); setQuartierFilter('') }}
                  className="btn btn-secondary"
                  type="button"
                >
                  Réinitialiser
                </button>
                <button onClick={fetchHistorique} className="btn btn-primary" type="button">
                  Actualiser
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="table-section">
        <div className="table-card">
          <div className="table-header">
            <h2>Historique des relevés (par adresse)</h2>
            <div className="table-count">
              {historique.length} résultat{historique.length > 1 ? 's' : ''}
            </div>
          </div>

          {historique.length === 0 ? (
            <div className="empty-state">
              <h3>Aucun relevé historique trouvé</h3>
              <p>Essayez de modifier les filtres.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date archivage</th>
                    <th>Mois</th>
                    <th>Adresse</th>
                    <th>Quartier</th>
                    <th>Compteur Eau</th>
                    <th>Compteur Électricité</th>
                    <th>Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {historique.map((row) => (
                    <tr key={row.id || `${row.adresseComplete}-${row.moisAnnee}-${row.quartier}`}>
                      <td>{formatDate(row.dateArchivage)}</td>
                      <td>{formatMois(row.moisAnnee)}</td>
                      <td className="td-strong">{row.adresseComplete || '—'}</td>
                      <td>{row.quartier || '—'}</td>

                      <td>
                        <div className="meterBlock">
                          <span className="badge badge-info">EAU</span>
                          {renderEauCell(row)}
                        </div>
                      </td>

                      <td>
                        <div className="meterBlock">
                          <span className="badge badge-warning">ELECTRICITE</span>
                          {renderElecCell(row)}
                        </div>
                      </td>

                      <td>{`${row.agentPrenom || ''} ${row.agentNom || ''}`.trim() || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReleveHistoriqueList
