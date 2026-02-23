import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUser } from "../../services/usersService";
import "./AddUser.css";

const AddUser = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    username: "",
    password: "",
    role: "UTILISATEUR",
  });

  const [loading, setLoading] = useState(false);
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!formData.nom.trim()) return "Le nom est obligatoire.";
    if (!formData.prenom.trim()) return "Le prénom est obligatoire.";
    if (!formData.email.trim()) return "L’email est obligatoire.";
    if (!formData.username.trim()) return "Le nom d’utilisateur est obligatoire.";
    if (!formData.password.trim()) return "Le mot de passe est obligatoire.";
    if (formData.password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
    return "";
  };

  const formatPrenom = (p) =>
    p
      .trim()
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setSuccess("");

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);

    try {
      const userData = {
        nom: formData.nom.trim().toUpperCase(),
        prenom: formatPrenom(formData.prenom),
        email: formData.email.trim(),
        telephone: formData.telephone.trim(),
        username: formData.username.trim(),
        password: formData.password,
        role: formData.role,
      };

      await createUser(userData);

      setSuccess("Utilisateur créé avec succès !");
      setTimeout(() => navigate("/superadmin/users"), 1200);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Erreur lors de la création de l'utilisateur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-user">
      {/* Header style dashboard */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Nouvel utilisateur</h1>
            <p className="header-subtitle">Ajouter un nouvel utilisateur au système</p>
          </div>
          <div className="header-right">
            <div className="date-display">{today}</div>
          </div>
        </div>
      </div>

      <div className="content-wrap">
        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="form-card">
          <div className="form-card-header">
            <h2>Informations</h2>
            <span className="chip">Création</span>
          </div>

          <form onSubmit={handleSubmit} className="user-form">
            <div className="grid">
              <div className="field">
                <label>Nom *</label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleInputChange}
                  placeholder="DUPONT"
                  required
                />
                <small className="help">Le nom sera enregistré en MAJUSCULES.</small>
              </div>

              <div className="field">
                <label>Prénom *</label>
                <input
                  type="text"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleInputChange}
                  placeholder="Jean"
                  required
                />
                <small className="help">Le prénom sera formaté automatiquement.</small>
              </div>

              <div className="field">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="jean.dupont@example.com"
                  required
                />
              </div>

              <div className="field">
                <label>Téléphone</label>
                <input
                  type="tel"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleInputChange}
                  placeholder="+212612345678"
                />
                <small className="help">Exemple : +212612345678</small>
              </div>

              <div className="field">
                <label>Nom d'utilisateur *</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="jdupont"
                  required
                />
              </div>

              <div className="field">
                <label>Rôle *</label>
                <select name="role" value={formData.role} onChange={handleInputChange} required>
                  <option value="UTILISATEUR">Utilisateur</option>
                  <option value="SUPERADMIN">Super Admin</option>
                </select>
              </div>

              <div className="field field-full">
                <label>Mot de passe *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Minimum 8 caractères"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div className="actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Création..." : "Créer utilisateur"}
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

        <div className="hint">
          Astuce: tu peux ajouter une vérification “username unique” côté front en appelant une API (si tu l’as).
        </div>
      </div>
    </div>
  );
};

export default AddUser;
