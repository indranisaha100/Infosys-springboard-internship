package com.knowledgegap.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "learning_enrollments")
@Getter
@Setter
@NoArgsConstructor
public class LearningEnrollment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String employeeEmail;

    @Column(nullable = false)
    private String learningTitle;

    @Column(nullable = false)
    private String status = "PENDING";

    @Column(nullable = false)
    private int progressPercent;

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();
}
