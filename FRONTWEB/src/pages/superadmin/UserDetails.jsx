import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getUserById, updateUser } from '../../services/usersService'
import './UserDetails.css'

const UserDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    username: '',
    role: 'UTILISATEUR'
  })

  useEffect(() => {
    fetchUser()
  }, [id])

  const fetchUser = async () => {
    try {
      setLoading(true)
      const response = await getUserById(id)
      setUser(response.data)
      setFormData({
        nom: response.data.nom,
        prenom: response.data.prenom,
        email: response.data.email,
        telephone: response.data.telephone || '',
        username: response.data.username,
        role: response.data.role
      })
    } catch (err) {
      setError('Utilisateur non trouvé')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await updateUser(id, formData)
      setIsEditing(false)
      fetchUser()
    } catch (err) {
      setError('Erreur lors de la mise à jour')
      console.error(err)
    }
  }

  if (loading) {
    return <div className="loading">Chargement...</div>
  }

  if (!user) {
    return <div className="error-message">Utilisateur non trouvé</div>
  }

  return (
    <div className="user-details">
      <div className="page-header">
        <h1>Détails de l'Utilisateur</h1>
        <p>{user.nom} {user.prenom}</p>
      </div>

      <div className="card">
        {error && <div className="error-message">{error}</div>}

        {!isEditing ? (
          <div className="user-info">
            <div className="info-row">
              <label>Nom:</label>
              <span>{user.nom}</span>
            </div>
            <div className="info-row">
              <label>Prénom:</label>
              <span>{user.prenom}</span>
            </div>
            <div className="info-row">
              <label>Email:</label>
              <span>{user.email}</span>
            </div>
            <div className="info-row">
              <label>Nom d'utilisateur:</label>
              <span>{user.username}</span>
            </div>
            <div className="info-row">
              <label>Rôle:</label>
              <span className={`badge badge-${user.role.toLowerCase()}`}>
                {user.role}
              </span>
            </div>
            <div className="info-row">
              <label>Téléphone:</label>
              <span>{user.telephone || 'Non renseigné'}</span>
            </div>
            <div className="actions">
              <button
                className="btn btn-primary"
                onClick={() => setIsEditing(true)}
              >
                Modifier
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/superadmin/users')}
              >
                Retour
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="edit-form">
            <div className="form-group">
              <label>Nom</label>
              <input
                type="text"
                name="nom"
                value={formData.nom}
                onChange={handleInputChange}
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label>Prénom</label>
              <input
                type="text"
                name="prenom"
                value={formData.prenom}
                onChange={handleInputChange}
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label>Nom d'utilisateur</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label>Rôle</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="form-control"
                required
              >
                                <option value="SUPERADMIN">Super Admin</option>
                <option value="UTILISATEUR">Utilisateur</option>
              </select>
            </div>
            <div className="form-group">
              <label>Téléphone</label>
              <input
                type="tel"
                name="telephone"
                value={formData.telephone}
                onChange={handleInputChange}
                className="form-control"
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Enregistrer
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsEditing(false)
                  fetchUser()
                }}
              >
                Annuler
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default UserDetails