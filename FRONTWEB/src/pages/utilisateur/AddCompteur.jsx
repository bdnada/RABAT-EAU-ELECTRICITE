import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Select from 'react-select'
import { createCompteur } from '../../services/compteursService'
import { getAdressesIncomplete } from '../../services/api'
import styles from './AddCompteur.module.css'

const AddCompteur = () => {
  const navigate = useNavigate()

  const [adresses, setAdresses] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({ adresseId: '', type: 'EAU' })

  const [loading, setLoading] = useState(false)
  const [loadingAdresses, setLoadingAdresses] = useState(false)
  const [error, setError] = useState('')
  const [showPopup, setShowPopup] = useState(false)

  useEffect(() => {
    const fetchAdresses = async () => {
      try {
        setLoadingAdresses(true)
        const response = await getAdressesIncomplete()
        setAdresses(response.data || [])
      } catch (err) {
        console.error(err)
        setError('Erreur lors du chargement des adresses incomplètes')
      } finally {
        setLoadingAdresses(false)
      }
    }
    fetchAdresses()
  }, [])

  // Filtrage via searchTerm (mais on garde aussi la recherche intégrée du Select)
  const filteredAdresses = useMemo(() => {
    if (!searchTerm) return adresses
    const term = searchTerm.toLowerCase()
    return adresses.filter((adresse) =>
      (adresse.adresseComplete || '').toLowerCase().includes(term) ||
      (adresse.quartier || '').toLowerCase().includes(term) ||
      (adresse.client?.nom || '').toLowerCase().includes(term) ||
      (adresse.client?.prenom || '').toLowerCase().includes(term)
    )
  }, [searchTerm, adresses])

  // options react-select
  const adresseOptions = useMemo(() => {
    return filteredAdresses.map((a) => ({
      value: a.id,
      label: a.adresseComplete || 'Adresse inconnue',
      quartier: a.quartier || '',
      client: `${a.client?.nom || ''} ${a.client?.prenom || ''}`.trim()
    }))
  }, [filteredAdresses])

  const selectedAdresseOption = useMemo(() => {
    return adresseOptions.find(o => o.value === formData.adresseId) || null
  }, [adresseOptions, formData.adresseId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await createCompteur(formData)
      setShowPopup(true)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Compteur déja crée')
    } finally {
      setLoading(false)
    }
  }

  const closePopup = () => {
    setShowPopup(false)
    navigate('/user/compteurs')
  }

  // style react-select (look dashboard)
  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 46,
      borderRadius: 14,
      borderColor: state.isFocused ? 'rgba(20,71,154,0.45)' : 'rgba(15,23,42,0.12)',
      boxShadow: state.isFocused ? '0 0 0 4px rgba(20,71,154,0.12)' : 'none',
      backgroundColor: '#fff',
      cursor: 'pointer',
      fontSize: 14,
      fontWeight: 600
    }),
    valueContainer: (base) => ({ ...base, padding: '0 12px' }),
    placeholder: (base) => ({ ...base, color: 'rgba(107,114,128,0.9)', fontWeight: 600 }),
    singleValue: (base) => ({ ...base, color: '#0f172a' }),
    indicatorSeparator: () => ({ display: 'none' }),
    dropdownIndicator: (base) => ({ ...base, paddingRight: 10 }),
    menu: (base) => ({
      ...base,
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: '0 18px 50px rgba(15,23,42,0.18)',
      border: '1px solid rgba(15,23,42,0.10)'
    }),
    menuList: (base) => ({ ...base, padding: 6 }),
    option: (base, state) => ({
      ...base,
      borderRadius: 12,
      margin: '4px 0',
      padding: 12,
      backgroundColor: state.isSelected
        ? 'rgba(20,71,154,0.10)'
        : state.isFocused
        ? 'rgba(20,71,154,0.06)'
        : '#fff',
      color: '#0f172a',
      cursor: 'pointer'
    })
  }

  return (
    <div className={styles.addCompteur}>
      <div className={styles.pageHeader}>
        <h1>Nouveau Compteur</h1>
        <p>Ajouter un compteur à une adresse incomplète</p>
      </div>

      <div className={styles.card}>
        {error && <div className={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Rechercher une adresse</label>
            <input
              type="text"
              placeholder="Adresse, quartier ou client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.formControl}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Sélectionner une adresse *</label>

            <Select
              options={adresseOptions}
              value={selectedAdresseOption}
              isLoading={loadingAdresses}
              placeholder="-- Sélectionner une adresse --"
              onChange={(opt) =>
                setFormData(prev => ({ ...prev, adresseId: opt?.value || '' }))
              }
              styles={selectStyles}
              // recherche interne dans la liste
              isSearchable
              noOptionsMessage={() => "Aucune adresse trouvée"}
              formatOptionLabel={(opt) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontWeight: 400 , fontSize: 14 }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {opt.quartier}
                                    </div>
                </div>
              )}
            />

            {/* validation required */}
            {!formData.adresseId && (
              <small className={styles.helperText}>Champ obligatoire</small>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Type de compteur *</label>
            <select
              name="type"
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className={styles.formControl}
              required
            >
              <option value="EAU">Eau</option>
              <option value="ELECTRICITE">Électricité</option>
            </select>
          </div>

          <div className={styles.formActions}>
            <button
              type="submit"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={loading || !formData.adresseId}
            >
              {loading ? 'Création...' : 'Créer le compteur'}
            </button>

            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={() => navigate('/user/compteurs')}
              disabled={loading}
            >
              Annuler
            </button>
          </div>
        </form>
      </div>

      {showPopup && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupContent}>
            <h2>Succès !</h2>
            <p>Le compteur a été créé avec succès.</p>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={closePopup}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AddCompteur
