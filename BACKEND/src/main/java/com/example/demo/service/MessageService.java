package com.example.demo.service;

import com.example.demo.dto.MessageDto;
import com.example.demo.entity.*;
import com.example.demo.repository.AgentTerrainRepository;
import com.example.demo.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepo;
    private final AgentTerrainRepository agentRepo;

    // ================= ENVOI =================

    public void sendFromAgent(String email, String contenu, MultipartFile image) {
        AgentTerrain agent = agentRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Agent introuvable"));

        if ((contenu == null || contenu.trim().isEmpty()) &&
                (image == null || image.isEmpty())) {
            throw new RuntimeException("Message vide interdit");
        }

        Message msg = new Message();
        msg.setAgent(agent);
        msg.setContenu(contenu);
        msg.setSender(SenderType.AGENT);
        msg.setLu(false);

        handleImage(msg, image);
        messageRepo.save(msg);
    }

    public void sendFromAdmin(Long agentId, String contenu, MultipartFile image) {
        AgentTerrain agent = agentRepo.findById(agentId)
                .orElseThrow(() -> new RuntimeException("Agent introuvable"));

        if ((contenu == null || contenu.trim().isEmpty()) &&
                (image == null || image.isEmpty())) {
            throw new RuntimeException("Message vide interdit");
        }

        Message msg = new Message();
        msg.setAgent(agent);
        msg.setContenu(contenu);
        msg.setSender(SenderType.UTILISATEUR);
        msg.setLu(false);

        handleImage(msg, image);
        messageRepo.save(msg);
    }

    private void handleImage(Message msg, MultipartFile image) {
        if (image != null && !image.isEmpty()) {
            try {
                msg.setImageData(image.getBytes());
                msg.setImageContentType(image.getContentType());
            } catch (IOException e) {
                throw new RuntimeException("Erreur image", e);
            }
        }
    }

    // ================= LECTURE =================

    @Transactional
    public List<MessageDto> getAgentMessages(String email) {
        AgentTerrain agent = agentRepo.findByEmail(email).orElseThrow();

        List<Message> messages = messageRepo.findByAgentIdOrderByCreatedAtAsc(agent.getId());

        messages.stream()
                .filter(m -> m.getSender() == SenderType.UTILISATEUR && !m.isLu())
                .forEach(m -> m.setLu(true));

        return messages.stream().map(this::toDto).toList();
    }

    @Transactional
    public List<MessageDto> getMessagesByAgent(Long agentId) {
        List<Message> messages = messageRepo.findByAgentIdOrderByCreatedAtAsc(agentId);

        messages.stream()
                .filter(m -> m.getSender() == SenderType.AGENT && !m.isLu())
                .forEach(m -> m.setLu(true));

        return messages.stream().map(this::toDto).toList();
    }

    // ================= BADGE =================

    public long countUnreadForAgent(String email) {
        AgentTerrain agent = agentRepo.findByEmail(email).orElseThrow();
        return messageRepo.countByAgentIdAndLuFalseAndSender(agent.getId(), SenderType.UTILISATEUR);
    }

    // ================= UPDATE =================

    public void updateMessage(Long messageId, String contenu) {
        Message msg = messageRepo.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message introuvable"));
        msg.setContenu(contenu);
        msg.setUpdatedAt(LocalDateTime.now());
        messageRepo.save(msg);
    }

    @Transactional
    public void updateMessageByAgent(Long messageId, String email, String contenu) {
        AgentTerrain agent = agentRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Agent introuvable"));
        Message msg = messageRepo.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message introuvable"));

        if (!msg.getAgent().getId().equals(agent.getId()) || msg.getSender() != SenderType.AGENT) {
            throw new RuntimeException("Action non autorisée");
        }

        msg.setContenu(contenu);
        msg.setUpdatedAt(LocalDateTime.now());
        messageRepo.save(msg);
    }

    // ================= DELETE =================

    public void deleteMessage(Long messageId) {
        if (!messageRepo.existsById(messageId)) {
            throw new RuntimeException("Message introuvable");
        }
        messageRepo.deleteById(messageId);
    }

    @Transactional
    public void deleteMessageByAgent(Long messageId, String email) {
        AgentTerrain agent = agentRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Agent introuvable"));
        Message msg = messageRepo.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message introuvable"));

        if (!msg.getAgent().getId().equals(agent.getId()) || msg.getSender() != SenderType.AGENT) {
            throw new RuntimeException("Action non autorisée");
        }
        messageRepo.delete(msg);
    }

    // ================= DTO =================

    private MessageDto toDto(Message m) {
        String base64 = null;
        if (m.getImageData() != null) {
            base64 = Base64.getEncoder().encodeToString(m.getImageData());
        }
        return new MessageDto(
                m.getId(),
                m.getContenu(),
                m.getSender().name(),
                m.isLu(),
                m.getCreatedAt(),
                m.getUpdatedAt(),
                base64,
                m.getImageContentType()
        );
    }
}
