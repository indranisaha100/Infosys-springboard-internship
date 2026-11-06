package com.knowledgegap.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "conversation_reports")
@Getter
@Setter
@NoArgsConstructor
public class ConversationReport {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversation_id", nullable = false)
    private Long conversationId;

    @Column(nullable = false)
    private String reporterEmail;

    @Column(nullable = false)
    private String reportedEmail;

    @Column(length = 500, nullable = false)
    private String reason;

    @Column(nullable = false)
    private String status; // OPEN

    @Column(nullable = false)
    private Instant createdAt;
}
