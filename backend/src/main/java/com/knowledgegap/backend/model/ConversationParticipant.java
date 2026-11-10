// ConversationParticipant.java
package com.knowledgegap.backend.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "conversation_participants",
        uniqueConstraints = @UniqueConstraint(columnNames = {"conversation_id", "user_email"}))
@Getter @Setter @NoArgsConstructor
public class ConversationParticipant {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "conversation_id", nullable = false)
    private Long conversationId;
    @Column(name = "user_email", nullable = false)
    private String userEmail;
    private Instant lastReadAt;
    private Boolean muted;
    private Boolean archived;
}