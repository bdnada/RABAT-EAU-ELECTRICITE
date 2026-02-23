// src/pages/utilisateur/AgentsChatList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { getAllAgents, getMessagesWithAgent } from "../../services/api";
import styles from "./AgentsChatList.module.css";

const AgentsChatList = ({ onSelectAgent, selectedAgentId }) => {
  const [agents, setAgents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgentsAndLastMessages = async () => {
      try {
        const agentsRes = await getAllAgents();
        const activeAgents = (agentsRes.data || []).filter((a) => a.active);

        const agentsWithLastMessage = await Promise.all(
          activeAgents.map(async (agent) => {
            try {
              const msgRes = await getMessagesWithAgent(agent.id);
              const messages = msgRes.data || [];
              const last = messages.length ? messages[messages.length - 1] : null;

              return {
                ...agent,
                lastMessage: last?.contenu || "Aucun message",
                sender: last?.sender,
                createdAt: last?.createdAt,
                lastMessageTime: last?.createdAt
                  ? new Date(last.createdAt).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "",
                isOnline: Math.random() > 0.35,
                unreadCount: 0,
              };
            } catch {
              return {
                ...agent,
                lastMessage: "Aucun message",
                lastMessageTime: "",
                isOnline: false,
                unreadCount: 0,
              };
            }
          })
        );

        // tri alpha par prénom+nom
        agentsWithLastMessage.sort((a, b) =>
          `${a.prenom || ""} ${a.nom || ""}`.localeCompare(`${b.prenom || ""} ${b.nom || ""}`)
        );

        setAgents(agentsWithLastMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentsAndLastMessages();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return agents;
    const q = search.toLowerCase();
    return agents.filter((a) => {
      const full = `${a.prenom || ""} ${a.nom || ""}`.toLowerCase();
      return full.includes(q) || (a.email || "").toLowerCase().includes(q);
    });
  }, [search, agents]);

  const getInitials = (agent) => {
    const initials = `${agent.prenom?.[0] || ""}${agent.nom?.[0] || ""}`.toUpperCase();
    return initials || "?";
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>Chargement...</span>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.top}>
        <div className={styles.titleBlock}>
          <div className={styles.title}>Chats</div>
          <div className={styles.sub}>Support</div>
        </div>

        <div className={styles.searchWrap}>
          <input
            className={styles.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un agent..."
            type="text"
          />
        </div>
      </div>

      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🔎</div>
            <div className={styles.emptyTitle}>Aucun résultat</div>
            <div className={styles.emptyText}>Essayez un autre mot.</div>
          </div>
        ) : (
          filtered.map((agent) => {
            const active = String(selectedAgentId) === String(agent.id);
            return (
              <button
                key={agent.id}
                type="button"
                className={`${styles.item} ${active ? styles.itemActive : ""}`}
                onClick={() => onSelectAgent?.(agent.id, agent.nom, agent.prenom)}
              >
                <div className={styles.avatarWrap}>
                  <div className={styles.avatar}>{getInitials(agent)}</div>
                  <span
                    className={`${styles.dot} ${agent.isOnline ? styles.dotOn : styles.dotOff}`}
                    title={agent.isOnline ? "En ligne" : "Hors ligne"}
                  />
                </div>

                <div className={styles.info}>
                  <div className={styles.row1}>
                    <div className={styles.name}>
                      {agent.prenom || ""} {agent.nom || ""}
                    </div>
                    <div className={styles.time}>{agent.lastMessageTime}</div>
                  </div>

                  <div className={styles.row2}>
                    <div className={styles.preview}>
                      {agent.sender === "UTILISATEUR" ? <b>Vous: </b> : null}
                      {agent.lastMessage}
                    </div>

                    {agent.unreadCount > 0 && (
                      <span className={styles.badge}>{agent.unreadCount}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AgentsChatList;
