// MessageRepository.java
package com.knowledgegap.backend.repository;
import com.knowledgegap.backend.model.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface MessageRepository extends JpaRepository<Message, Long> {
    @Query("select m from Message m where m.conversationId = :cid and m.id < :before order by m.id desc")
    List<Message> findPage(@Param("cid") Long cid, @Param("before") Long before, Pageable pageable);

    Optional<Message> findFirstByConversationIdOrderByIdDesc(Long conversationId);

    @Query("select count(m) from Message m where m.conversationId = :cid "
            + "and m.senderEmail <> :me and m.sentAt > :since")
    long countUnread(@Param("cid") Long cid, @Param("me") String me, @Param("since") Instant since);
}