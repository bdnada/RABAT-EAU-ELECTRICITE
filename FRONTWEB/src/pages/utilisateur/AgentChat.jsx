// src/pages/utilisateur/AgentChat.jsx
import React, { useState, useEffect, useRef } from "react";
import { sendMessageToAgent, getMessagesWithAgent, getAgentById } from "../../services/api";
import styles from "./AgentChat.module.css";

// ✅ Modal pour agrandir l'image
const ImageViewerModal = ({ isOpen, src, onClose }) => {
  const imgRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !src) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative",
          maxWidth: "95vw",
          maxHeight: "90vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: -10,
            right: -10,
            width: 36,
            height: 36,
            borderRadius: 999,
            border: "none",
            cursor: "pointer",
            fontSize: 18,
            background: "#fff",
          }}
          aria-label="Fermer"
        >
          ✕
        </button>

        <img
          ref={imgRef}
          src={src}
          alt="Aperçu"
          style={{
            maxWidth: "95vw",
            maxHeight: "90vh",
            borderRadius: 12,
            display: "block",
          }}
        />
      </div>
    </div>
  );
};

const AgentChat = ({ agentId, agentName: propAgentName }) => {
  const [messages, setMessages] = useState([]);
  const [agent, setAgent] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ viewer image
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerSrc, setViewerSrc] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const previousMessagesLength = useRef(0);

  const displayName =
    propAgentName ||
    (agent ? `${agent.prenom || ""} ${agent.nom || ""}`.trim() : `Agent #${agentId}`);

  const openImage = (src) => {
    setViewerSrc(src);
    setViewerOpen(true);
  };

  const closeImage = () => {
    setViewerOpen(false);
    setViewerSrc(null);
  };

  const fetchData = async () => {
    if (!agentId) return;

    try {
      const [messagesRes, agentRes] = await Promise.all([
        getMessagesWithAgent(agentId),
        getAgentById(agentId),
      ]);

      const newMessages = messagesRes.data || [];
      if (newMessages.length !== previousMessagesLength.current) {
        setMessages(newMessages);
        previousMessagesLength.current = newMessages.length;
      }

      setAgent(agentRes.data);
      setError(null);
    } catch (err) {
      console.error("Erreur chargement conversation:", err);
      setError("Impossible de charger la conversation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!agentId) return;
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [agentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !imageFile) return;

    const messageToSend = newMessage.trim();

    setNewMessage("");
    setImageFile(null);
    setImagePreview(null);

    try {
      await sendMessageToAgent(agentId, messageToSend, imageFile);

      const tempMessage = {
        id: Date.now(),
        contenu: messageToSend,
        sender: "UTILISATEUR",
        createdAt: new Date().toISOString(),
        updatedAt: null,
        imageBase64: imageFile ? URL.createObjectURL(imageFile) : null,
        imageContentType: imageFile ? imageFile.type : null,
        lu: false,
      };

      setMessages((prev) => [...prev, tempMessage]);
      setTimeout(fetchData, 500);
    } catch (err) {
      console.error("Erreur envoi message:", err);
      alert("Erreur lors de l'envoi du message");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("L'image est trop volumineuse (max 5MB)");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  if (!agentId) return <div className={styles.state}>Sélectionnez un agent pour discuter</div>;
  if (loading) return <div className={styles.state}>Chargement...</div>;
  if (error) return <div className={styles.stateError}>{error}</div>;

  return (
    <div className={styles.chatContainer}>
      {/* ✅ Modal viewer */}
      <ImageViewerModal isOpen={viewerOpen} src={viewerSrc} onClose={closeImage} />

      <div className={styles.chatHeader}>
        <div>
          <div className={styles.chatTitle}>{displayName}</div>
          <div className={styles.chatSub}>Conversation</div>
        </div>
      </div>

      <div className={styles.messages}>
        {messages.length === 0 ? (
          <div className={styles.noMessages}>Aucun message pour l’instant.</div>
        ) : (
          messages.map((msg) => {
            const isAgent = msg.sender === "AGENT";
            const imgSrc = msg.imageBase64
              ? msg.imageBase64.startsWith("data:")
                ? msg.imageBase64
                : `data:${msg.imageContentType};base64,${msg.imageBase64}`
              : null;

            return (
              <div
                key={msg.id}
                className={`${styles.bubble} ${isAgent ? styles.received : styles.sent}`}
              >
                {msg.contenu && <div className={styles.text}>{msg.contenu}</div>}

                {imgSrc && (
                  <img
                    src={imgSrc}
                    alt="attachment"
                    className={styles.image}
                    style={{ cursor: "zoom-in" }}
                    onClick={() => openImage(imgSrc)} // ✅ agrandir ici
                  />
                )}

                <small className={styles.time}>
                  {new Date(msg.createdAt).toLocaleString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                  {msg.updatedAt && " (modifié)"}
                </small>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className={styles.form} onSubmit={handleSend}>
        {imagePreview && (
          <div className={styles.previewWrap}>
            <img
              src={imagePreview}
              alt="preview"
              className={styles.previewImg}
              style={{ cursor: "zoom-in" }}
              onClick={() => openImage(imagePreview)} // ✅ agrandir preview aussi
            />
            <button type="button" className={styles.previewRemove} onClick={removeImage}>
              ✕
            </button>
          </div>
        )}

        <input
          className={styles.input}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={`Écrire à ${displayName}...`}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className={styles.fileInput}
        />

        <button type="button" className={styles.attachBtn} onClick={triggerFileInput}>
          📎
        </button>

        <button type="submit" disabled={!newMessage.trim() && !imageFile} className={styles.btn}>
          Send message →
        </button>
      </form>
    </div>
  );
};

export default AgentChat;
