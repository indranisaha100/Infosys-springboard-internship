// ConversationRepository.java
package com.knowledgegap.backend.repository;
import com.knowledgegap.backend.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ConversationRepository extends JpaRepository<Conversation, Long> {}
