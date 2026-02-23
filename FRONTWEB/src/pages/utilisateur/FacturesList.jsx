import React, { useState, useEffect, useRef } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import axios from 'axios'
import { getAllFactures, downloadFacturePdf, sendFactureEmail } from '../../services/api'
import eerLogo from '../../assets/Gemini_Generated_Image_yzzfc7yzzfc7yzzf-removebg-preview.png'
import styles from './FacturesList.module.css'

const FacturesList = () => {
  const [factures, setFactures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sendingEmail, setSendingEmail] = useState({})

  const [showSignModal, setShowSignModal] = useState(false)
  const [currentFacture, setCurrentFacture] = useState(null)
  const [signError, setSignError] = useState('')
  const [isSigning, setIsSigning] = useState(false)

  const sigRef = useRef(null)

  // ✅ Toast (Popup succès/erreur)
  const [toast, setToast] = useState({ open: false, type: 'success', message: '' })

  const showToast = (message, type = 'success') => {
    setToast({ open: true, type, message })
    window.clearTimeout(window.__toastTimer)
    window.__toastTimer = window.setTimeout(() => {
      setToast(prev => ({ ...prev, open: false }))
    }, 2600)
  }

  useEffect(() => {
    fetchFactures()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchFactures = async () => {
    try {
      setLoading(true)
      const res = await getAllFactures()
      setFactures(res.data || [])
      setError(null)
    } catch (err) {
      console.error('Erreur chargement factures:', err)
      setError('Impossible de charger les factures')
    } finally {
      setLoading(false)
    }
  }

  // ✅ Récupérer adresse (selon structure API)
  const getAdresseFromFacture = (f) => {
    return (
      f?.adresseComplete ||
      f?.adresse?.adresseComplete ||
      f?.client?.adresse?.adresseComplete ||
      f?.compteur?.adresse?.adresseComplete ||
      f?.releve?.compteur?.adresse?.adresseComplete ||
      f?.adresse ||
      'Adresse inconnue'
    )
  }

  const stats = {
    total: factures.length,
    sent: factures.filter(f => f.status === 'SENT').length,
    signed: factures.filter(f => f.status === 'SIGNED').length,
    pending: factures.filter(f => !f.status || f.status === 'PENDING').length
  }

  const handleDownload = async (factureUniqueId, nomClient) => {
    try {
      const response = await downloadFacturePdf(factureUniqueId)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute(
        'download',
        `facture_${(nomClient || 'client').replace(/\s+/g, '_')}_${factureUniqueId}.pdf`
      )
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      showToast('❌ Erreur lors du téléchargement du PDF', 'error')
    }
  }

  const handleSendEmail = async (factureId, emailClient, nomClient) => {
    if (!window.confirm(`Envoyer la facture à ${nomClient} (${emailClient}) ?`)) return

    setSendingEmail(prev => ({ ...prev, [factureId]: true }))
    try {
      await sendFactureEmail(factureId)
      showToast('✅ Facture envoyée par email avec succès', 'success')
      fetchFactures()
    } catch (err) {
      showToast(err.response?.data || '❌ Erreur envoi email', 'error')
    } finally {
      setSendingEmail(prev => ({ ...prev, [factureId]: false }))
    }
  }

  const openSignModal = (facture) => {
    if (!facture.emailClient) {
      showToast('❌ Aucun email associé à cette facture', 'error')
      return
    }
    setCurrentFacture(facture)
    setShowSignModal(true)
    setSignError('')
    sigRef.current?.clear()
  }

  const getSignatureDataURL = () => {
    if (!sigRef.current || sigRef.current.isEmpty()) return null
    return sigRef.current.toDataURL('image/png')
  }

  const sendSignature = async () => {
    const signature = getSignatureDataURL()
    if (!signature) {
      setSignError('Veuillez dessiner votre signature.')
      return
    }

    setIsSigning(true)
    setSignError('')

    try {
      await axios.post(
        `http://localhost:8081/api/factures/sign/request/${currentFacture.id}`,
        { email: currentFacture.emailClient, signature },
        { headers: { 'Content-Type': 'application/json' } }
      )

      showToast('✅ Facture signée avec succès', 'success')
      setShowSignModal(false)
      setCurrentFacture(null)
      sigRef.current?.clear()
      fetchFactures()
    } catch (err) {
      console.error(err)
      const msg = err.response?.data || 'Erreur lors de la signature'
      setSignError(msg)
      showToast(`❌ ${msg}`, 'error')
    } finally {
      setIsSigning(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}></div>
        <p className={styles.loadingText}>Chargement des factures...</p>
      </div>
    )
  }

  if (error) {
    return <div className={styles.errorMessage}>{error}</div>
  }

  return (
    <div className={styles.facturesContainer}>
      <div className={styles.pageHeader}>
        <h1>Gestion des Factures</h1>
        <p>Suivi et signature des factures</p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Factures total</span>
            <span className={`${styles.statIcon} ${styles.iconDocs}`} />
          </div>
          <div className={styles.statValue}>{stats.total}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Envoyées</span>
            <span className={`${styles.statIcon} ${styles.iconMail}`} />
          </div>
          <div className={styles.statValue}>{stats.sent}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>Signées</span>
            <span className={`${styles.statIcon} ${styles.iconCheck}`} />
          </div>
          <div className={styles.statValue}>{stats.signed}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statTitle}>En attente</span>
            <span className={`${styles.statIcon} ${styles.iconClock}`} />
          </div>
          <div className={styles.statValue}>{stats.pending}</div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Adresse</th>
                <th>Mois</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {factures.length > 0 ? (
                factures.map((f) => {
                  const adresse = getAdresseFromFacture(f)

                  return (
                    <tr key={f.id}>
                      <td>
                        <div className={styles.addressCell}>{adresse}</div>
                      </td>

                      <td>
                        <span className={styles.moisPill}>{f.mois || '—'}</span>
                      </td>

                      <td>
                        {f.status === 'SENT' && (
                          <span className={`${styles.badge} ${styles.badgeInfo}`}>Envoyée</span>
                        )}
                        {f.status === 'SIGNED' && (
                          <span className={`${styles.badge} ${styles.badgeSuccess}`}>Signée</span>
                        )}
                        {(!f.status || f.status === 'PENDING') && (
                          <span className={`${styles.badge} ${styles.badgeWarn}`}>Non signée</span>
                        )}
                      </td>

                      <td>
                        <div className={styles.btnGroup}>
                          {f.status === 'SENT' ? (
                            <span className={`${styles.badge} ${styles.badgeNeutral}`}>Déjà envoyée</span>
                          ) : f.status === 'SIGNED' ? (
                            <button
                              className={`${styles.btn} ${styles.btnPrimary}`}
                              onClick={() => handleSendEmail(f.id, f.emailClient, f.nomClient)}
                              disabled={sendingEmail[f.id]}
                              type="button"
                            >
                              {sendingEmail[f.id] ? 'Envoi...' : 'Envoyer email'}
                            </button>
                          ) : (
                            <button
                              className={`${styles.btn} ${styles.btnWarn}`}
                              onClick={() => openSignModal(f)}
                              disabled={!f.emailClient}
                              type="button"
                            >
                              Signer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="4" className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📄</div>
                    <p>Aucune facture trouvée</p>
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      </div>

      {showSignModal && (
        <div className={styles.modalOverlay} onClick={() => !isSigning && setShowSignModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Signature électronique</h3>
              <button
                className={styles.closeBtn}
                onClick={() => !isSigning && setShowSignModal(false)}
                disabled={isSigning}
                aria-label="Fermer"
                type="button"
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              {signError && (
                <div className={`${styles.alert} ${styles.alertDanger}`}>
                  {signError}
                </div>
              )}

              <div className={styles.signatureInfo}>
                <div className={styles.signatureInfoInner}>
                  <div className={styles.signatureDetails}>
                    <p><strong>Signé par :</strong> Administrateur</p>
                    <p><strong>Date :</strong> {new Date().toLocaleDateString('fr-FR')}</p>
                    <p className={styles.certified}>Signé et certifié par EER</p>
                  </div>

                  <img src={eerLogo} alt="EER Logo" className={styles.signatureLogo} />
                </div>
              </div>

              <div className={styles.signatureCanvasContainer}>
                <SignatureCanvas
                  ref={sigRef}
                  penColor="#000000"
                  minWidth={0.6}
                  maxWidth={1.6}
                  velocityFilterWeight={0.98}
                  dotSize={0.8}
                  throttle={2}
                  canvasProps={{ className: styles.signatureCanvas }}
                />
              </div>

              <div className={styles.signatureActions}>
                <button
                  className={`${styles.btn} ${styles.btnDanger}`}
                  onClick={() => sigRef.current?.clear()}
                  disabled={isSigning}
                  type="button"
                >
                  Effacer
                </button>

                <button
                  className={`${styles.btn} ${styles.btnSuccess}`}
                  disabled={isSigning}
                  onClick={sendSignature}
                  type="button"
                >
                  {isSigning ? 'Signature...' : 'Valider la signature'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ TOAST POPUP */}
      {toast.open && (
        <div
          className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}
          role="alert"
        >
          <span>{toast.message}</span>
          <button
            className={styles.toastClose}
            onClick={() => setToast(prev => ({ ...prev, open: false }))}
            type="button"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}

export default FacturesList
