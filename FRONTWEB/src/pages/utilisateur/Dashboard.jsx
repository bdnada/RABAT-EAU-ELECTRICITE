// Dashboard.jsx - avec filtres Mois + Type + icônes transparents
import React, { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ComposedChart, ScatterChart, Scatter, ZAxis,
  AreaChart, Area, LineChart
} from 'recharts'
import { getCompteurs, getReleves, getAgents } from '../../services/api'
import './Dashboard.css'

const Dashboard = () => {
  const [loading, setLoading] = useState(true)
  const [compteurs, setCompteurs] = useState([])
  const [releves, setReleves] = useState([])
  const [agents, setAgents] = useState([])

  // filtres
  const [selectedMonth, setSelectedMonth] = useState('ALL') // ex: "2026-01"
  const [selectedType, setSelectedType] = useState('ALL') // ALL | EAU | ELECTRICITE

  useEffect(() => {
    fetchDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [compteursRes, relevesRes, agentsRes] = await Promise.all([
        getCompteurs(),
        getReleves(),
        getAgents()
      ])

      setCompteurs(compteursRes.data || [])
      setReleves(relevesRes.data || [])
      setAgents(agentsRes.data || [])
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  // mois disponibles depuis les relevés
  const monthOptions = useMemo(() => {
    const months = new Set()
    for (const r of releves) {
      if (!r?.dateReleve) continue
      const d = new Date(r.dateReleve)
      if (Number.isNaN(d.getTime())) continue
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months.add(key)
    }
    return ['ALL', ...Array.from(months).sort((a, b) => b.localeCompare(a))]
  }, [releves])

  const formatMonthLabel = (yyyyMM) => {
    if (yyyyMM === 'ALL') return 'Tous les mois'
    const [y, m] = yyyyMM.split('-')
    const d = new Date(Number(y), Number(m) - 1, 1)
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  }

  const matchMonth = (dateString, yyyyMM) => {
    if (yyyyMM === 'ALL') return true
    const d = new Date(dateString)
    if (Number.isNaN(d.getTime())) return false
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return key === yyyyMM
  }

  // releves filtrés
  const filteredReleves = useMemo(() => {
    return releves.filter(r => {
      if (!r?.dateReleve) return false
      if (!matchMonth(r.dateReleve, selectedMonth)) return false
      if (selectedType === 'ALL') return true
      return r.compteur?.type === selectedType
    })
  }, [releves, selectedMonth, selectedType])

  // compteurs filtrés par type (le mois n'existe pas dans compteurs)
  const filteredCompteurs = useMemo(() => {
    if (selectedType === 'ALL') return compteurs
    return compteurs.filter(c => c.type === selectedType)
  }, [compteurs, selectedType])

  // stats (basées sur filtres)
  const stats = useMemo(() => {
    const totalCompteurs = filteredCompteurs.length
    const totalReleves = filteredReleves.length
    const totalAgents = agents.length

    const relevesEau = filteredReleves.filter(r => r.compteur?.type === 'EAU')
    const relevesElec = filteredReleves.filter(r => r.compteur?.type === 'ELECTRICITE')

    const consommationMoyenneEau = relevesEau.length
      ? Math.round(relevesEau.reduce((s, r) => s + (r.consommation || 0), 0) / relevesEau.length)
      : 0

    const consommationMoyenneElec = relevesElec.length
      ? Math.round(relevesElec.reduce((s, r) => s + (r.consommation || 0), 0) / relevesElec.length)
      : 0

    // couverture "simple": relevés / (compteurs * 30)
    const tauxCouverture = totalCompteurs
      ? Math.min(Math.round((totalReleves / (totalCompteurs * 30)) * 100), 100)
      : 0

    return {
      totalCompteurs,
      totalReleves,
      totalAgents,
      tauxCouverture,
      consommationMoyenneEau,
      consommationMoyenneElec
    }
  }, [filteredCompteurs, filteredReleves, agents])

  // recent relevés (filtrés)
  const recentReleves = useMemo(() => {
    const copy = [...filteredReleves].sort((a, b) => new Date(b.dateReleve) - new Date(a.dateReleve))
    return copy.slice(0, 6)
  }, [filteredReleves])

  // charts data
  const consommationData = useMemo(() => ([
    { type: 'Eau', valeur: stats.consommationMoyenneEau },
    { type: 'Électricité', valeur: stats.consommationMoyenneElec }
  ]), [stats.consommationMoyenneEau, stats.consommationMoyenneElec])

  const comboData = useMemo(() => {
    // regrouper par mois depuis filteredReleves
    const map = new Map()
    for (const r of filteredReleves) {
      const d = new Date(r.dateReleve)
      if (Number.isNaN(d.getTime())) continue
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const cur = map.get(key) || { key, releves: 0, consommation: 0 }
      cur.releves += 1
      cur.consommation += (r.consommation || 0)
      map.set(key, cur)
    }
    const arr = Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key))
    return arr.map(item => {
      const [y, m] = item.key.split('-')
      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('fr-FR', { month: 'short' })
      return { mois: label, releves: item.releves, consommation: Math.round(item.consommation) }
    })
  }, [filteredReleves])

  const scatterData = useMemo(() => {
    // si on n'a pas d'heure, on génère depuis dateReleve
    return filteredReleves.slice(0, 80).map(r => {
      const d = new Date(r.dateReleve)
      const heure = Number.isNaN(d.getTime()) ? 0 : d.getHours()
      return {
        heure,
        consommation: r.consommation || 0,
        type: r.compteur?.type || 'UNKNOWN',
        size: Math.min(260, Math.max(60, (r.consommation || 0)))
      }
    })
  }, [filteredReleves])

  const evolution7j = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString().split('T')[0]
    }).reverse()

    return last7Days.map(date => {
      const dayReleves = filteredReleves.filter(r =>
        r?.dateReleve && new Date(r.dateReleve).toISOString().split('T')[0] === date
      )

      const eau = dayReleves
        .filter(r => r.compteur?.type === 'EAU')
        .reduce((sum, r) => sum + (r.consommation || 0), 0)

      const elec = dayReleves
        .filter(r => r.compteur?.type === 'ELECTRICITE')
        .reduce((sum, r) => sum + (r.consommation || 0), 0)

      return {
        date: new Date(date).toLocaleDateString('fr-FR', { weekday: 'short' }),
        eau,
        elec
      }
    })
  }, [filteredReleves])

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tt-title">{label}</p>
          {payload.map((entry, index) => (
            <div className="tt-row" key={index}>
              <span className="tt-dot" style={{ background: entry.color || entry.fill }} />
              <span className="tt-name">{entry.name || entry.dataKey}</span>
              <span className="tt-val">{entry.value}</span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p className="loading-text">Chargement des données...</p>
      </div>
    )
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Dashboard</h1>
            <p className="header-subtitle">Gestion des compteurs d'eau et d'électricité</p>
          </div>

          <div className="header-right">
            {/* Filters */}
            <div className="filters">
              <div className="filter-item">
                <span className="filter-label">Mois</span>
                <select
                  className="filter-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {monthOptions.map(m => (
                    <option key={m} value={m}>{formatMonthLabel(m)}</option>
                  ))}
                </select>
              </div>

              <div className="filter-item">
                <span className="filter-label">Type</span>
                <select
                  className="filter-select"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="ALL">Tous</option>
                  <option value="EAU">Eau</option>
                  <option value="ELECTRICITE">Électricité</option>
                </select>
              </div>
            </div>

            <div className="date-display">
              {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <h3 className="stat-title">Compteurs</h3>
            <div className="stat-icon icon-style icon-meters" />
          </div>
          <div className="stat-body">
            <p className="stat-value">{stats.totalCompteurs}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <h3 className="stat-title">Relevés</h3>
            <div className="stat-icon icon-style icon-notes" />
          </div>
          <div className="stat-body">
            <p className="stat-value">{stats.totalReleves}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <h3 className="stat-title">Agents</h3>
            <div className="stat-icon icon-style icon-users" />
          </div>
          <div className="stat-body">
            <p className="stat-value">{stats.totalAgents}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <h3 className="stat-title">Couverture</h3>
            <div className="stat-icon icon-style icon-coverage" />
          </div>
          <div className="stat-body">
            <p className="stat-value">{stats.tauxCouverture}%</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-section">
        <div className="charts-grid">
         {/* Area */}
<div className="chart-card">
  <div className="chart-header">
    <h2>Consommation Moyenne</h2>
    <div className="chart-legend">
      <div className="legend-item">
        <div className="legend-dot water"></div>
        <span>Eau</span>
      </div>
      <div className="legend-item">
        <div className="legend-dot electricity"></div>
        <span>Électricité</span>
      </div>
    </div>
  </div>

  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={consommationData}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey="type" stroke="#6b7280" fontSize={11} />
      <YAxis stroke="#6b7280" fontSize={11} />
      <Tooltip content={<CustomTooltip />} />

      <Area
        type="monotone"
        dataKey="valeur"
        stroke="#14479a"
        fill="#14479a"
        fillOpacity={0.15}
        strokeWidth={3}
        name="Consommation"
      />
    </AreaChart>
  </ResponsiveContainer>
</div>


{/* Évolution Mensuelle — LineChart normal */}
<div className="chart-card">
  <div className="chart-header">
    <h2>Évolution Mensuelle</h2>
    <div className="chip">Mensuel</div>
  </div>

  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={comboData}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis
        dataKey="mois"
        stroke="#6b7280"
        fontSize={11}
      />
      <YAxis
        stroke="#6b7280"
        fontSize={11}
      />
      <Tooltip content={<CustomTooltip />} />

      {/* Courbe Relevés */}
      <Line
        type="monotone"
        dataKey="releves"
        stroke="#3b82f6"
        strokeWidth={2}
        dot={{ r: 3 }}
        activeDot={{ r: 5 }}
        name="Relevés"
      />

      {/* Courbe Consommation */}
      <Line
        type="monotone"
        dataKey="consommation"
        stroke="#10b981"
        strokeWidth={2}
        dot={{ r: 3 }}
        activeDot={{ r: 5 }}
        name="Consommation"
      />
    </LineChart>
  </ResponsiveContainer>
</div>



          {/* Scatter */}
          <div className="chart-card">
            <div className="chart-header">
              <h2>Distribution</h2>
              <div className="chip">Relevés</div>
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="heure" stroke="#6b7280" fontSize={11} domain={[0, 23]} />
                <YAxis dataKey="consommation" stroke="#6b7280" fontSize={11} />
                <ZAxis dataKey="size" range={[60, 280]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />

                <Scatter
                  name="EAU"
                  data={scatterData.filter(d => d.type === 'EAU')}
                  fill="#06b6d4"
                  shape="circle"
                />
                <Scatter
                  name="ELECTRICITE"
                  data={scatterData.filter(d => d.type === 'ELECTRICITE')}
                  fill="#f59e0b"
                  shape="triangle"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Area */}
          <div className="chart-card">
            <div className="chart-header">
              <h2>Évolution (7 jours)</h2>
              <div className="chip">Tendance</div>
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolution7j}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="eau" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.12} strokeWidth={2} name="Eau" />
                <Area type="monotone" dataKey="elec" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.12} strokeWidth={2} name="Électricité" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activité récente */}
      <div className="recent-activity">
        <div className="activity-header">
          <h2>Activité Récente</h2>
          <div className="chip">Filtrée</div>
        </div>

        <div className="table-responsive">
          <table className="activity-table">
            <thead>
              <tr>
                <th>Date & Heure</th>
                <th>Compteur</th>
                <th>Type</th>
                <th>Agent</th>
                <th>Consommation</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {recentReleves.length > 0 ? (
                recentReleves.map((r, index) => (
                  <tr key={r.id || index}>
                    <td>
                      {new Date(r.dateReleve).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td><strong>{r.compteur?.numeroCompteur?.substring(0, 8) || 'N/A'}</strong></td>
                    <td>
                      <span className={`badge badge-${r.compteur?.type?.toLowerCase()}`}>
                        {r.compteur?.type || 'N/A'}
                      </span>
                    </td>
                    <td>{r.agent?.prenom?.charAt(0)}. {r.agent?.nom}</td>
                    <td>
                      <strong>{r.consommation || 0}</strong> {r.compteur?.type === 'EAU' ? 'm³' : 'kWh'}
                    </td>
                    <td><span className="status-indicator status-active">Validé</span></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="no-data">
                    <div className="no-data-icon">📭</div>
                    <p>Aucun relevé avec ces filtres</p>
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

export default Dashboard
