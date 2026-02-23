// src/pages/utilisateur/AgentsChatPage.jsx
import React, { useState } from "react";
import AgentsChatList from "./AgentsChatList";
import AgentChat from "./AgentChat";
import styles from "./AgentChatPage.module.css";
import appLogo from "../../assets/logo.png"; // ⬅️ adapte le chemin

const AgentsChatPage = () => {
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [selectedAgentName, setSelectedAgentName] = useState("");

  const handleSelectAgent = (id, nom, prenom) => {
    setSelectedAgentId(id);
    setSelectedAgentName(`${prenom || ""} ${nom || ""}`.trim());
  };

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <aside className={styles.left}>
          <AgentsChatList
            onSelectAgent={handleSelectAgent}
            selectedAgentId={selectedAgentId}
          />
        </aside>


        <main className={styles.right}>
          {selectedAgentId ? (
            <AgentChat agentId={selectedAgentId} agentName={selectedAgentName} />
          ) : (
            <div className={styles.empty}>
              <img
                src={appLogo}
                alt="App logo"
                className={styles.emptyLogo}
              />
              
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AgentsChatPage;
