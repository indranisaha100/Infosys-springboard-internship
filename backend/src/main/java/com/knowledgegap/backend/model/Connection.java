package com.knowledgegap.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "connections",
        uniqueConstraints = @UniqueConstraint(columnNames = {"requester_email", "receiver_email"}))
@Getter
@Setter
@NoArgsConstructor
public class Connection {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "requester_email", nullable = false)
    private String requesterEmail;

    @Column(name = "receiver_email", nullable = false)
    private String receiverEmail;

    @Column(nullable = false)
    private String status; // PENDING or ACCEPTED

    @Column(nullable = false)
    private Instant createdAt;
}