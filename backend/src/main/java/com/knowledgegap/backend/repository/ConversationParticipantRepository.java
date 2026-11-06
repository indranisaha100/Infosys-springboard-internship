// ConversationParticipantRepository.java
package com.knowledgegap.backend.repository;
import com.knowledgegap.backend.model.ConversationParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ConversationParticipantRepository extends JpaRepository<ConversationParticipant, Long> {
    List<ConversationParticipant> findByUserEmail(String userEmail);
    List<ConversationParticipant> findByConversationId(Long conversationId);
    Optional<ConversationParticipant> findByConversationIdAndUserEmail(Long conversationId, String userEmail);

    @Query("select a.conversationId from ConversationParticipant a, ConversationParticipant b "
            + "where a.conversationId = b.conversationId and a.userEmail = :x and b.userEmail = :y")
    List<Long> findSharedConversationIds(@Param("x") String x, @Param("y") String y);
}