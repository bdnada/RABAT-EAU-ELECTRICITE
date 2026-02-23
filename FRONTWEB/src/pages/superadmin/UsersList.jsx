import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getUsers, deleteUser } from "../../services/usersService";
import "./UsersList.css";

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const [deletingId, setDeletingId] = useState(null);

  const navigate = useNavigate();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getUsers();
      setUsers(response.data || []);
    } catch (err) {
      console.error(err);
      setError("Erreur lors du chargement des utilisateurs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (user) => {
    const fullName = `${user.prenom || ""} ${user.nom || ""}`.trim() || user.username;

    if (!window.confirm(`Supprimer l’utilisateur "${fullName}" ?`)) return;

    setDeletingId(user.id);
    setError("");
    setSuccess("");

    try {
      await deleteUser(user.id);
      setSuccess("Utilisateur supprimé avec succès");
      await fetchUsers();
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la suppression");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (user) => {
    navigate(`/superadmin/users/edit/${user.id}`, { state: { user } });
  };

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();

    return users.filter((u) => {
      const matchesQuery =
        !q ||
        `${u.nom || ""} ${u.prenom || ""} ${u.email || ""} ${u.username || ""}`
          .toLowerCase()
          .includes(q);

      const matchesRole =
        roleFilter === "ALL" || String(u.role || "").toUpperCase() === roleFilter;

      return matchesQuery && matchesRole;
    });
  }, [users, query, roleFilter]);

  const getInitials = (user) => {
    const a = (user.prenom?.[0] || "").toUpperCase();
    const b = (user.nom?.[0] || "").toUpperCase();
    return (a + b) || (user.username?.[0] || "U").toUpperCase();
  };

  if (loading) {
    return <div className="loading">Chargement des utilisateurs...</div>;
  }

  return (
    <div className="users-list">
      <div className="page-header">
        <h1>Gestion des Utilisateurs</h1>
        <p>Liste des utilisateurs du système</p>
      </div>

      {/* Actions */}
      <div className="actions-bar">
        <button className="btn btn-primary" onClick={() => navigate("/superadmin/users/add")}>
          + Nouvel Utilisateur
        </button>

        <button className="btn btn-secondary" onClick={fetchUsers}>
          ↻ Actualiser
        </button>
      </div>

      {/* Filters */}
      <div className="filters-row">
        <input
          className="search-input"
          type="text"
          placeholder="Rechercher (nom, prénom, email, username)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <select
          className="role-select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="ALL">Tous les rôles</option>
          <option value="USER">USER</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
        </select>
      </div>

      {/* Feedback */}
      {success && <div className="success-message">{success}</div>}
      {error && (
        <div className="error-message">
          {error}{" "}
          <button className="btn btn-secondary" onClick={fetchUsers} style={{ marginLeft: 10 }}>
            Réessayer
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card">
        {filteredUsers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <p>Aucun utilisateur trouvé</p>
            {(query || roleFilter !== "ALL") && (
              <small>Essayez de changer la recherche ou le filtre.</small>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Utilisateur</th>
                <th>Email</th>
                <th>Username</th>
                <th>Rôle</th>
                <th>Téléphone</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>

                  <td>
                    <div className="user-cell">
                      <div className="user-initials">{getInitials(user)}</div>
                      <div className="user-meta">
                        <div className="user-fullname">
                          {user.prenom} {user.nom}
                        </div>
                        <div className="user-subrole">{user.role}</div>
                      </div>
                    </div>
                  </td>

                  <td className="muted">{user.email}</td>
                  <td>{user.username}</td>

                  <td>
                    <span className={`badge badge-${String(user.role || "").toLowerCase()}`}>
                      {user.role}
                    </span>
                  </td>

                  <td>{user.telephone || "—"}</td>

                  <td className="actions">
                    <button className="btn btn-edit" onClick={() => handleEdit(user)}>
                      Modifier
                    </button>

                    <button
                      className="btn btn-delete"
                      onClick={() => handleDelete(user)}
                      disabled={deletingId === user.id}
                      title="Supprimer cet utilisateur"
                    >
                      {deletingId === user.id ? "Suppression..." : "Supprimer"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default UsersList;
