import React, { useState, useEffect, useRef } from 'react'
import { sendAllFactures, sendClientFacture, getClients } from '../../services/api'
import styles from './Facturation.module.css'

const Facturation = () => {
  const [clientAddress, setClientAddress] = useState('')
  const [clients, setClients] = useState([])
  const [filteredClients, setFilteredClients] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingClients, setLoadingClients] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [results, setResults] = useState(null)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // pour gérer blur/click proprement
  const blurTimeoutRef = useRef(null)

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoadingClients(true)
        const response = await getClients()
        setClients(response.data || [])
      } catch (err) {
        console.error('Erreur lors du chargement des clients:', err)
      } finally {
        setLoadingClients(false)
      }
    }

    fetchClients()
  }, [])

  useEffect(() => {
    const q = clientAddress.trim().toLowerCase()

    if (q) {
      const filtered = clients.filter((client) => {
        const addr = (client.address || '').toLowerCase()
        const name = (client.name || '').toLowerCase()
        const email = (client.email || '').toLowerCase()
        return addr.includes(q) || name.includes(q) || email.includes(q)
      })

      setFilteredClients(filtered.slice(0, 10))
      setShowSuggestions(true)
    } else {
      setFilteredClients([])
      setShowSuggestions(false)
    }
  }, [clientAddress, clients])

  const handleSendAll = async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    setResults(null)

    try {
      const response = await sendAllFactures()
      setSuccess('Consommations envoyées avec succès')
      setResults(response.data)
    } catch (err) {
      setError(err.response?.data || "Erreur lors de l'envoi des consommations")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSendClient = async () => {
    const input = clientAddress.trim()
    if (!input) {
      setError('Veuillez entrer une adresse client')
      return
    }

    const lower = input.toLowerCase()
    const exact = clients.find(
      (c) =>
        (c.address || '').toLowerCase() === lower ||
        (c.name || '').toLowerCase() === lower ||
        (c.email || '').toLowerCase() === lower
    )

    const client =
      exact ||
      clients.find(
        (c) =>
          (c.address || '').toLowerCase().includes(lower) ||
          (c.name || '').toLowerCase().includes(lower) ||
          (c.email || '').toLowerCase().includes(lower)
      )

    if (!client) {
      setError('Client non trouvé avec cette adresse')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    setResults(null)

    try {
      const response = await sendClientFacture(client.id)
      setSuccess(`Consommation envoyée avec succès pour ${client.name || client.address}`)
      setResults(response.data)
      setShowSuggestions(false)
    } catch (err) {
      setError(err.response?.data || "Erreur lors de l'envoi de la consommation")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleClientSelect = (client) => {
    setClientAddress(client.address || client.name || client.email || '')
    setShowSuggestions(false)
    setError('')
    setSuccess('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSendClient()
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const handleFocus = () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
    if (filteredClients.length > 0) setShowSuggestions(true)
  }

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => setShowSuggestions(false), 180)
  }

  return (
    <div className={styles.facturation}>
      <div className={styles.pageHeader}>
        <h1>Consommations</h1>
        <p>Génération et envoi des consommations vers Odoo</p>
      </div>

      <div className={styles.facturationGrid}>
        {/* CARD 1 */}
        <div className={styles.card}>
          <h2>Envoi Global</h2>
          <p>Générer et envoyer les consommations pour tous les clients</p>

          <button
            onClick={handleSendAll}
            disabled={loading}
            className={`${styles.btn} ${styles.btnPrimary}`}
            type="button"
          >
            {loading ? (
              <>
                <span className={styles.loadingSpinner}></span>
                Envoi en cours...
              </>
            ) : (
              'Envoyer Toutes les Consommations'
            )}
          </button>
        </div>

        {/* ✅ CARD 2 SUPPRIMÉE (envoi par client) */}
      </div>

      {error && (
        <div className={`${styles.errorMessage} ${styles.card}`}>
          <h3>Erreur</h3>
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className={`${styles.successMessage} ${styles.card}`}>
          <h3>Succès</h3>
          <p>{success}</p>

          {results && (
            <div className={styles.results}>
              <pre>{JSON.stringify(results, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      <div className={`${styles.infoCard} ${styles.card}`}>
        <h3>Informations</h3>
        <ul>
          <li>Les consommations sont envoyées à Odoo</li>
          <li>Le PDF sera récupéré automatiquement après confirmation dans Odoo</li>
          <li>Vérifiez les factures dans Odoo avant de les envoyer aux clients</li>
          <li>Le calcul est basé sur les relevés du mois en cours</li>
          <li>Recherchez les clients par adresse, nom ou email</li>
        </ul>
      </div>
    </div>
  )
}

export default Facturation
