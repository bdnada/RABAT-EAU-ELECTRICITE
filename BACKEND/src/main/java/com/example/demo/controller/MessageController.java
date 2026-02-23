package com.example.demo.controller;

import com.example.demo.dto.MessageDto;
import com.example.demo.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService service;

    // ================= AGENT =================

    @PostMapping(value = "/agent/image", consumes = "multipart/form-data")
    public void sendFromAgent(
            @RequestParam("contenu") String contenu,
            @RequestParam(value = "image", required = false) MultipartFile image,
            Authentication auth) {
        service.sendFromAgent(auth.getName(), contenu, image);
    }

    @GetMapping("/agent")
    public List<MessageDto> getAgentMessages(Authentication auth) {
        return service.getAgentMessages(auth.getName());
    }

    @GetMapping("/agent/unread-count")
    public long unreadCount(Authentication auth) {
        return service.countUnreadForAgent(auth.getName());
    }

    @PutMapping("/agent/{messageId}")
    public void updateMessageByAgent(
            @PathVariable Long messageId,
            @RequestBody String contenu,
            Authentication auth) {
        service.updateMessageByAgent(messageId, auth.getName(), contenu);
    }

    @DeleteMapping("/agent/{messageId}")
    public void deleteMessageByAgent(
            @PathVariable Long messageId,
            Authentication auth) {
        service.deleteMessageByAgent(messageId, auth.getName());
    }



    @PostMapping(value = "/admin/{agentId}/image", consumes = "multipart/form-data")
    public void sendFromAdmin(
            @PathVariable Long agentId,
            @RequestParam("contenu") String contenu,
            @RequestParam(value = "image", required = false) MultipartFile image) {
        service.sendFromAdmin(agentId, contenu, image);
    }

    @GetMapping("/admin/{agentId}")
    public List<MessageDto> getMessagesByAgent(@PathVariable Long agentId) {
        return service.getMessagesByAgent(agentId);
    }

    @PutMapping("/{messageId}")
    public void updateMessage(
            @PathVariable Long messageId,
            @RequestBody String contenu) {
        service.updateMessage(messageId, contenu);
    }

    @DeleteMapping("/{messageId}")
    public void deleteMessage(@PathVariable Long messageId) {
        service.deleteMessage(messageId);
    }
}
