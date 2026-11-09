package com.knowledgegap.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "hr_notifications")
@Getter
@Setter
@NoArgsConstructor
public class HrNotification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 4000)
    private String message;

    @Column(nullable = false)
    private String audience;

    @Column(nullable = false)
    private Instant sentAt = Instant.now();
}
