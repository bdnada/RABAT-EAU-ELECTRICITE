import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./Login.css";
import logo from "../assets/Gemini_Generated_Image_yzzfc7yzzfc7yzzf-removebg-preview.png";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setError(err?.message || "Identifiants incorrects");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loginPage">
      <div className="loginCard">
        {/* HEADER */}
        <div className="loginHeader">
          <div className="brand">
            <div className="brandLogoWrap">
              <img src={logo} alt="Logo" className="brandLogo" />
            </div>

            <div className="brandText">
              <h1>SI Relevés</h1>
              <p>RABAT ÉNERGIE & EAU</p>
            </div>
          </div>

          <div className="welcome">
            <h2>Connexion</h2>
            <p>Accédez à votre espace de gestion</p>
          </div>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="loginForm">
          <div className="field">
            <label>Nom d'utilisateur ou Email</label>
            <div className="inputWrap">
              <span className="inputIcon iconUser" aria-hidden="true" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nom d'utilisateur ou email"
                required
                disabled={loading}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="field">
            <label>Mot de passe</label>
            <div className="inputWrap">
              <span className="inputIcon iconLock" aria-hidden="true" />
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                required
                disabled={loading}
                autoComplete="current-password"
              />

              <button
                type="button"
                className="iconBtn"
                onClick={() => setShowPwd((s) => !s)}
                disabled={loading}
                aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                title={showPwd ? "Masquer" : "Afficher"}
              >
                <span className={`inputIcon ${showPwd ? "iconEyeOff" : "iconEye"}`} />
              </button>
            </div>
          </div>

          <div className="row">
            <label className="remember">
              <input type="checkbox" disabled={loading} />
              <span>Se souvenir de moi</span>
            </label>

            
          </div>

          {error && <div className="loginError">{error}</div>}

          <button type="submit" className="loginBtn" disabled={loading}>
            <span className="btnText">{loading ? "Connexion..." : "Se connecter"}</span>
            <span className="btnArrow" aria-hidden="true">→</span>
          </button>
        </form>

        {/* FOOTER */}
        <div className="loginFooter">
          <p>© 2026 Rabat Énergie & Eau</p>
          <span>Système de Gestion des Relevés</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
