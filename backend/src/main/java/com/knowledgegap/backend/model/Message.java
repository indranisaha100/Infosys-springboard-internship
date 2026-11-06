// Message.java
package com.knowledgegap.backend.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "messages")
@Getter @Setter @NoArgsConstructor
public class Message {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "conversation_id", nullable = false)
    private Long conversationId;
    @Column(nullable = false)
    private String senderEmail;
    @Column(nullable = false, length = 2000)
    private String text;
    @Column(nullable = false)
    private Instant sentAt;
}
