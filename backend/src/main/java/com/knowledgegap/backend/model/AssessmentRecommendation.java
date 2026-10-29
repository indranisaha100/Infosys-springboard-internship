package com.knowledgegap.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(
        name = "assessment_recommendations",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"employee_email", "assessment_submitted_at"}))
@Getter
@Setter
@NoArgsConstructor
public class AssessmentRecommendation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_email", nullable = false)
    private String employeeEmail;

    @Column(name = "assessment_submitted_at", nullable = false)
    private Instant assessmentSubmittedAt;

    @Column(name = "recommendation_json", nullable = false, columnDefinition = "text")
    private String recommendationJson;

    @Column(nullable = false)
    private Instant generatedAt;
}
