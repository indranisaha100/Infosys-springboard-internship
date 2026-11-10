package com.knowledgegap.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "assessment_scores")
@Getter
@Setter
@NoArgsConstructor
public class AssessmentScore {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String employeeEmail;

    @Column(nullable = false)
    private String topic;

    @Column(nullable = false)
    private int rightAnswers;

    @Column(nullable = false)
    private int totalQuestions;

    @Column(nullable = false)
    private int targetAnswers;

    @Column(nullable = false)
    private Instant submittedAt;
}
