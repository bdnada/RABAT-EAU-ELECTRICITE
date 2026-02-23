import React, { useEffect, useState } from 'react'
import { getReleves, getAgents } from '../../services/api'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import logoEER from '../../assets/Gemini_Generated_Image_yzzfc7yzzfc7yzzf-removebg-preview.png'
import eerLogo from '../../assets/Gemini_Generated_Image_yzzfc7yzzfc7yzzf-removebg-preview.png'
import './Reports.css'

const Reports = () => {
  const [stats, setStats] = useState({
    totalReleves: 0,
    relevesEau: 0,
    relevesElec: 0,
    agentsActifs: 0,
    consommationTotaleEau: 0,
    consommationTotaleElec: 0,
    moyenneRelevesParAgent: 0,
    evolutionEau: 0,
    evolutionElec: 0
  })

  const [loading, setLoading] = useState(true)
  const [previousPeriodData, setPreviousPeriodData] = useState(null)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchReportData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange])

  const calculatePreviousPeriod = () => {
    const startDate = new Date(dateRange.start)
    const endDate = new Date(dateRange.end)
    const diffTime = Math.abs(endDate - startDate)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    const prevEndDate = new Date(startDate)
    prevEndDate.setDate(prevEndDate.getDate() - 1)

    const prevStartDate = new Date(prevEndDate)
    prevStartDate.setDate(prevStartDate.getDate() - diffDays)

    return {
      start: prevStartDate.toISOString().split('T')[0],
      end: prevEndDate.toISOString().split('T')[0]
    }
  }

  const fetchReportData = async () => {
    try {
      setLoading(true)

      const [relevesRes, agentsRes] = await Promise.all([getReleves(), getAgents()])
      const releves = relevesRes.data || []
      const agents = agentsRes.data || []

      // Filtrer période actuelle
      const filteredReleves = releves.filter((releve) => {
        if (!releve.dateReleve) return false
        const releveDate = new Date(releve.dateReleve).toISOString().split('T')[0]
        return releveDate >= dateRange.start && releveDate <= dateRange.end
      })

      // Filtrer période précédente
      const previousPeriod = calculatePreviousPeriod()
      const previousFilteredReleves = releves.filter((releve) => {
        if (!releve.dateReleve) return false
        const releveDate = new Date(releve.dateReleve).toISOString().split('T')[0]
        return releveDate >= previousPeriod.start && releveDate <= previousPeriod.end
      })

      const relevesEau = filteredReleves.filter((r) => r.compteur?.type === 'EAU')
      const relevesElec = filteredReleves.filter((r) => r.compteur?.type === 'ELECTRICITE')

      const previousRelevesEau = previousFilteredReleves.filter((r) => r.compteur?.type === 'EAU')
      const previousRelevesElec = previousFilteredReleves.filter((r) => r.compteur?.type === 'ELECTRICITE')

      const consommationTotaleEau = relevesEau.reduce((sum, r) => sum + (parseFloat(r.consommation) || 0), 0)
      const consommationTotaleElec = relevesElec.reduce((sum, r) => sum + (parseFloat(r.consommation) || 0), 0)

      const previousConsommationEau = previousRelevesEau.reduce((sum, r) => sum + (parseFloat(r.consommation) || 0), 0)
      const previousConsommationElec = previousRelevesElec.reduce((sum, r) => sum + (parseFloat(r.consommation) || 0), 0)

      const agentsAvecCompte = agents.filter((a) => a.email && a.email.trim() !== '' && a.email !== 'Non défini')
      const agentsActifsCount = agentsAvecCompte.length

      const moyenneRelevesParAgent = agentsActifsCount > 0 ? Math.round(filteredReleves.length / agentsActifsCount) : 0

      const evolutionEau =
        previousConsommationEau > 0 ? ((consommationTotaleEau - previousConsommationEau) / previousConsommationEau) * 100 : 0

      const evolutionElec =
        previousConsommationElec > 0 ? ((consommationTotaleElec - previousConsommationElec) / previousConsommationElec) * 100 : 0

      setStats({
        totalReleves: filteredReleves.length,
        relevesEau: relevesEau.length,
        relevesElec: relevesElec.length,
        agentsActifs: agentsActifsCount,
        consommationTotaleEau,
        consommationTotaleElec,
        moyenneRelevesParAgent,
        evolutionEau: parseFloat(evolutionEau.toFixed(1)),
        evolutionElec: parseFloat(evolutionElec.toFixed(1))
      })

      setPreviousPeriodData({
        periode: previousPeriod,
        totalReleves: previousFilteredReleves.length,
        consommationEau: previousConsommationEau,
        consommationElec: previousConsommationElec
      })
    } catch (error) {
      console.error('Erreur lors du chargement des rapports:', error)
      alert('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const handleDateChange = (e) => {
    const { name, value } = e.target
    setDateRange((prev) => ({ ...prev, [name]: value }))
  }

  // ✅ helper format nombre (évite caractères bizarres dans PDF)
  const formatNumber = (n) => {
    const v = Number(n || 0)
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })
      .format(v)
      .replace(/\u202f/g, ' ')
      .replace(/\u00a0/g, ' ')
  }

  // ✅ convertir logo en base64 pour jsPDF
  const toDataURL = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = function () {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = url
    })

  // ✅ PDF MODIFIÉ (logo + tableau normal)
  const handleExportPDF = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageW = pdf.internal.pageSize.getWidth()

      // --- Logo + header ---
      let y = 12
      try {
        const logo = await toDataURL(eerLogo)
        pdf.addImage(logo, 'PNG', 14, y, 24, 24)
      } catch (e) {
        console.warn('Logo non chargé', e)
      }

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(16)
      pdf.setTextColor(20)
      pdf.text('Rapport Statistiques - Relevés', 44, 20)

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(90)
      pdf.text(`Période : ${dateRange.start} au ${dateRange.end}`, 44, 26)
      pdf.text(`Généré le : ${new Date().toLocaleString('fr-FR')}`, 44, 31)

      // ligne fine
      pdf.setDrawColor(200)
      pdf.setLineWidth(0.2)
      pdf.line(14, 40, pageW - 14, 40)

      // --- Tableau normal (pas de bande bleu, pas zebra) ---
      autoTable(pdf, {
        startY: 46,
        theme: 'grid',
        head: [['Indicateur', 'Valeur', 'Comparaison / Évolution']],
        body: [
          ['Total relevés', formatNumber(stats.totalReleves), previousPeriodData ? `vs ${formatNumber(previousPeriodData.totalReleves)}` : '-'],
          ['Relevés Eau', formatNumber(stats.relevesEau), '-'],
          ['Consommation Eau (m³)', formatNumber(stats.consommationTotaleEau), `${stats.evolutionEau > 0 ? '+' : ''}${stats.evolutionEau}%`],
          ['Relevés Électricité', formatNumber(stats.relevesElec), '-'],
          ['Consommation Électricité (kWh)', formatNumber(stats.consommationTotaleElec), `${stats.evolutionElec > 0 ? '+' : ''}${stats.evolutionElec}%`],
          ['Agents actifs', formatNumber(stats.agentsActifs), '-'],
          ['Moyenne relevés/agent', formatNumber(stats.moyenneRelevesParAgent), '-']
        ],
        styles: {
          fontSize: 10,
          cellPadding: 3,
          textColor: 20,
          lineWidth: 0.2,
          lineColor: 200
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: 0,
          fontStyle: 'bold',
          lineColor: 120
        },
        alternateRowStyles: { fillColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 35, halign: 'center' },
          2: { cellWidth: 70 }
        },
        margin: { left: 14, right: 14 }
      })

      // --- Comparaison (si existe) ---
      if (previousPeriodData) {
        autoTable(pdf, {
          startY: pdf.lastAutoTable.finalY + 10,
          theme: 'grid',
          head: [['Comparaison', 'Valeur']],
          body: [
            ['Période précédente', `${previousPeriodData.periode.start} au ${previousPeriodData.periode.end}`],
            ['Total relevés (période précédente)', formatNumber(previousPeriodData.totalReleves)],
            ['Consommation Eau précédente', formatNumber(previousPeriodData.consommationEau)],
            ['Consommation Électricité précédente', formatNumber(previousPeriodData.consommationElec)]
          ],
          styles: {
            fontSize: 10,
            cellPadding: 3,
            textColor: 20,
            lineWidth: 0.2,
            lineColor: 200
          },
          headStyles: {
            fillColor: [255, 255, 255],
            textColor: 0,
            fontStyle: 'bold',
            lineColor: 120
          },
          alternateRowStyles: { fillColor: [255, 255, 255] },
          margin: { left: 14, right: 14 }
        })
      }

      // footer
      pdf.setFontSize(9)
      pdf.setTextColor(130)
      pdf.text('EER - Système de gestion des relevés', 14, pdf.internal.pageSize.getHeight() - 10)

      pdf.save(`rapport-statistiques-${dateRange.start}_au_${dateRange.end}.pdf`)
    } catch (err) {
      console.error('Erreur export PDF:', err)
      alert('Erreur lors de la génération du PDF')
    }
  }

  // ✅ Excel (inchangé)
  const handleExportExcel = () => {
    const data = [
      ['RAPPORT STATISTIQUES - RELEVÉS DE COMPTEURS', '', ''],
      ['Période', `${dateRange.start} au ${dateRange.end}`, ''],
      ['Date de génération', new Date().toLocaleDateString('fr-FR'), ''],
      [''],
      ['INDICATEURS PRINCIPAUX', 'VALEUR', 'ÉVOLUTION'],
      ['Total Relevés', stats.totalReleves, previousPeriodData ? `vs ${previousPeriodData.totalReleves}` : ''],
      ['Relevés Eau', stats.relevesEau, ''],
      ['Consommation Eau (m³)', stats.consommationTotaleEau, `${stats.evolutionEau > 0 ? '+' : ''}${stats.evolutionEau}%`],
      ['Relevés Électricité', stats.relevesElec, ''],
      ['Consommation Électricité (kWh)', stats.consommationTotaleElec, `${stats.evolutionElec > 0 ? '+' : ''}${stats.evolutionElec}%`],
      ['Agents Actifs', stats.agentsActifs, ''],
      ['Moyenne relevés/agent', stats.moyenneRelevesParAgent, ''],
      [''],
      ['INFORMATIONS SUPPLÉMENTAIRES'],
      ['Période de comparaison', previousPeriodData ? `${previousPeriodData.periode.start} au ${previousPeriodData.periode.end}` : 'Non disponible'],
      ['Consommation Eau période précédente', previousPeriodData ? previousPeriodData.consommationEau : 'N/A'],
      ['Consommation Électricité période précédente', previousPeriodData ? previousPeriodData.consommationElec : 'N/A']
    ]

    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()

    ws['!cols'] = [{ wch: 40 }, { wch: 25 }, { wch: 20 }]
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }]

    XLSX.utils.book_append_sheet(wb, ws, 'Statistiques')

    const rawData = [['Statistiques détaillées'], ['Métrique', 'Valeur'], ...Object.entries(stats).map(([k, v]) => [k, v])]
    const ws2 = XLSX.utils.aoa_to_sheet(rawData)
    ws2['!cols'] = [{ wch: 30 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Données brutes')

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })

    saveAs(blob, `rapport-statistiques-${dateRange.start}_au_${dateRange.end}.xlsx`)
  }

  const getEvolutionClass = (value) => {
    if (value > 0) return 'evolution-negative'
    if (value < 0) return 'evolution-positive'
    return 'evolution-neutral'
  }

  if (loading) {
    return (
      <div className="reports-loading">
        <div className="loading-spinner"></div>
        <p>Chargement des rapports...</p>
      </div>
    )
  }

  return (
    <div className="reports-container">
      {/* En-tête */}
      <div className="reports-header">
        <div className="header-content">
          <h1>Rapports et Statistiques</h1>
          <p className="header-subtitle">
            Analyse des relevés de consommation{' '}
            {dateRange.start === dateRange.end ? `du ${dateRange.start}` : `du ${dateRange.start} au ${dateRange.end}`}
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-icon" onClick={() => window.print()} type="button">
            Imprimer
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="filters-section">
        <div className="filter-card">
          <h3>Filtres de période</h3>
          <div className="filter-grid">
            <div className="filter-group">
              <label htmlFor="startDate">Date de début</label>
              <input
                id="startDate"
                type="date"
                name="start"
                value={dateRange.start}
                onChange={handleDateChange}
                className="date-input"
                max={dateRange.end}
              />
            </div>
            <div className="filter-group">
              <label htmlFor="endDate">Date de fin</label>
              <input
                id="endDate"
                type="date"
                name="end"
                value={dateRange.end}
                onChange={handleDateChange}
                className="date-input"
                min={dateRange.start}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="filter-group">
              <button onClick={fetchReportData} className="btn btn-primary btn-refresh" type="button">
                Actualiser
              </button>
            </div>
          </div>

          {previousPeriodData && (
            <div className="comparison-info">
              <small>
                Comparaison avec la période du {previousPeriodData.periode.start} au {previousPeriodData.periode.end}
              </small>
            </div>
          )}
        </div>
      </div>

      {/* Cartes de statistiques */}
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-card stat-card-primary">
            <div className="stat-content">
              <h3>Total Relevés</h3>
              <div className="stat-value">{stats.totalReleves.toLocaleString()}</div>
              <div className="stat-label">Relevés collectés</div>
              {previousPeriodData && (
                <div className="stat-comparison">
                  <span
                    className={`comparison-badge ${stats.totalReleves > previousPeriodData.totalReleves ? 'positive' : 'negative'}`}
                  >
                    {stats.totalReleves > previousPeriodData.totalReleves ? '↑' : '↓'}{' '}
                    {Math.abs(((stats.totalReleves - previousPeriodData.totalReleves) / previousPeriodData.totalReleves) * 100 || 0).toFixed(1)}
                    %
                  </span>
                  <span className="comparison-text">vs {previousPeriodData.totalReleves} période précédente</span>
                </div>
              )}
            </div>
          </div>

          <div className="stat-card stat-card-water">
            <div className="stat-content">
              <h3>Relevés Eau</h3>
              <div className="stat-value">{stats.relevesEau.toLocaleString()}</div>
              <div className="stat-details">
                <div className="consumption-value">
                  {stats.consommationTotaleEau.toLocaleString()} <small>m³</small>
                </div>
                <div className="stat-label">Consommation totale</div>
                {stats.evolutionEau !== 0 && (
                  <div className={`evolution-indicator ${getEvolutionClass(stats.evolutionEau)}`}>
                    {stats.evolutionEau > 0 ? '↑' : '↓'} {Math.abs(stats.evolutionEau)}%
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="stat-card stat-card-electricity">
            <div className="stat-content">
              <h3>Relevés Électricité</h3>
              <div className="stat-value">{stats.relevesElec.toLocaleString()}</div>
              <div className="stat-details">
                <div className="consumption-value">
                  {stats.consommationTotaleElec.toLocaleString()} <small>kWh</small>
                </div>
                <div className="stat-label">Consommation totale</div>
                {stats.evolutionElec !== 0 && (
                  <div className={`evolution-indicator ${getEvolutionClass(stats.evolutionElec)}`}>
                    {stats.evolutionElec > 0 ? '↑' : '↓'} {Math.abs(stats.evolutionElec)}%
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="stat-card stat-card-agents">
            <div className="stat-content">
              <h3>Agents Actifs</h3>
              <div className="stat-value">{stats.agentsActifs}</div>
              <div className="stat-details">
                <div className="average-value">
                  {stats.moyenneRelevesParAgent} <small>relevés/agent</small>
                </div>
                <div className="stat-label">Moyenne par agent</div>
                <div className="performance-indicator">
                  {stats.moyenneRelevesParAgent > 10
                    ? 'Excellent'
                    : stats.moyenneRelevesParAgent > 5
                      ? 'Bon'
                      : stats.moyenneRelevesParAgent > 2
                        ? 'Moyen'
                        : 'À améliorer'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="export-section">
        <div className="export-card">
          <div className="export-header">
            <h3>Exporter les Rapports</h3>
            <p>Exportez vos statistiques dans différents formats</p>
          </div>

          <div className="export-options">
            <div className="export-option">
              <div className="option-content">
                <h4>Format PDF</h4>
                <p>Rapport tableau + logo (style normal)</p>
              </div>
              <button onClick={handleExportPDF} className="btn btn-outline" type="button">
                Exporter PDF
              </button>
            </div>

            <div className="export-option">
              <div className="option-content">
                <h4>Format Excel</h4>
                <p>Données brutes avec feuilles multiples</p>
              </div>
              <button onClick={handleExportExcel} className="btn btn-outline btn-success" type="button">
                Exporter Excel
              </button>
            </div>
          </div>

          <div className="export-tips">
            <div className="tip">
              <span>Le PDF est idéal pour le partage et l'impression</span>
            </div>
            <div className="tip">
              <span>L'Excel permet l'analyse approfondie des données</span>
            </div>
          </div>
        </div>
      </div>

      {/* Résumé */}
      <div className="summary-section">
        <div className="summary-card">
          <h3>Résumé des indicateurs</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <div className="summary-label">Taux de collecte Eau</div>
              <div className="summary-value">
                {stats.totalReleves > 0 ? ((stats.relevesEau / stats.totalReleves) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Taux de collecte Électricité</div>
              <div className="summary-value">
                {stats.totalReleves > 0 ? ((stats.relevesElec / stats.totalReleves) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Productivité moyenne</div>
              <div className="summary-value">{stats.moyenneRelevesParAgent} relevés/jour</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Période analysée</div>
              <div className="summary-value">
                {dateRange.start === dateRange.end
                  ? '1 jour'
                  : `${Math.ceil((new Date(dateRange.end) - new Date(dateRange.start)) / (1000 * 60 * 60 * 24))} jours`}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="report-footer">
        <p>
          Généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
        </p>
        <p className="footer-note">Rapport généré automatiquement par le système de gestion des relevés</p>
      </div>
    </div>
  )
}

export default Reports
