import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getUserById, updateUser } from "../../services/usersService";
import "./EditUser.css";

const EditUser = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    username: "",
    role: "UTILISATEUR",
  });

  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const today = useMemo(() => {
    return new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoadingUser(true);
        setError("");

        if (location.state?.user) {
          const u = location.state.user;
          setFormData({
            nom: u.nom || "",
            prenom: u.prenom || "",
            email: u.email || "",
            telephone: u.telephone || "",
            username: u.username || "",
            role: u.role || "UTILISATEUR",
          });
        } else {
          const res = await getUserById(id);
          const u = res.data || {};
          setFormData({
            nom: u.nom || "",
            prenom: u.prenom || "",
            email: u.email || "",
            telephone: u.telephone || "",
            username: u.username || "",
            role: u.role || "UTILISATEUR",
          });
        }
      } catch (e) {
        console.error(e);
        setError("Erreur lors du chargement de l’utilisateur");
      } finally {
        setLoadingUser(false);
      }
    };

    loadUser();
  }, [id, location.state]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!formData.nom.trim()) return "Le nom est obligatoire.";
    if (!formData.prenom.trim()) return "Le prénom est obligatoire.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await updateUser(id, formData);
      setSuccess("Utilisateur mis à jour !");
      setTimeout(() => navigate("/superadmin/users"), 1200);
    } catch (e) {
      console.error(e);
      setError("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  if (loadingUser) return <div className="loading">Chargement...</div>;

  return (
    <div className="edit-user">
      {/* Header style dashboard */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Modifier utilisateur</h1>
            <p className="header-subtitle">Mise à jour des informations du compte</p>
          </div>
          <div className="header-right">
            <div className="date-display">{today}</div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="content-wrap">
        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="form-card">
          <div className="form-card-header">
            <h2>Informations utilisateur</h2>
            <span className="chip">ID: {id}</span>
          </div>

          <form onSubmit={handleSubmit} className="user-form">
            <div className="grid">
              <div className="field">
                <label>Nom *</label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  required
                  placeholder="Nom"
                />
              </div>

              <div className="field">
                <label>Prénom *</label>
                <input
                  type="text"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleChange}
                  required
                  placeholder="Prénom"
                />
              </div>

              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="ex: user@email.com"
                />
              </div>

              <div className="field">
                <label>Téléphone</label>
                <input
                  type="tel"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  placeholder="ex: 06xxxxxxxx"
                />
              </div>

              <div className="field">
                <label>Nom d'utilisateur *</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  readOnly
                  className="readonly"
                />
                <small className="help">Le username ne peut pas être modifié.</small>
              </div>

              <div className="field">
                <label>Rôle *</label>
                <select name="role" value={formData.role} onChange={handleChange}>
                  <option value="UTILISATEUR">Utilisateur</option>
                  <option value="SUPERADMIN">Super Admin</option>
                </select>
              </div>
            </div>

            <div className="actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "En cours..." : "Enregistrer"}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/superadmin/users")}
                disabled={loading}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditUser;
