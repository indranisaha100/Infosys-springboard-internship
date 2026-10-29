package com.knowledgegap.backend.repository;

import com.knowledgegap.backend.model.AssessmentRecommendation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface AssessmentRecommendationRepository extends JpaRepository<AssessmentRecommendation, Long> {
    Optional<AssessmentRecommendation> findByEmployeeEmailAndAssessmentSubmittedAt(
            String employeeEmail, Instant assessmentSubmittedAt);
}
