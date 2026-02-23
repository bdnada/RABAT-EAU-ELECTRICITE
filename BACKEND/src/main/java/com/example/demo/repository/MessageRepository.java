package com.example.demo.repository;

import com.example.demo.entity.Message;
import com.example.demo.entity.SenderType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByAgentIdOrderByCreatedAtAsc(Long agentId);

    long countByAgentIdAndLuFalseAndSender(Long agentId, SenderType sender);
}
