package com.knowledgegap.backend.repository;

import com.knowledgegap.backend.model.AssessmentScore;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssessmentScoreRepository extends JpaRepository<AssessmentScore, Long> {
    List<AssessmentScore> findByEmployeeEmailOrderBySubmittedAtDesc(String employeeEmail);

    List<AssessmentScore> findAllByOrderBySubmittedAtDesc();
}
