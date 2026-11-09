package com.knowledgegap.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "mentorship_requests")
@Getter
@Setter
@NoArgsConstructor
public class MentorshipRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String employeeEmail;

    @Column(nullable = false)
    private String mentorEmail;

    @Column(length = 2000)
    private String message;

    @Column(nullable = false)
    private String status = "PENDING";

    @Column(nullable = false)
    private Instant createdAt = Instant.now();
}
