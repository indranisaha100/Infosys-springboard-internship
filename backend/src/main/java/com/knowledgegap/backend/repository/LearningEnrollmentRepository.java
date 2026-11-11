package com.knowledgegap.backend.repository;

import com.knowledgegap.backend.model.LearningEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LearningEnrollmentRepository extends JpaRepository<LearningEnrollment, Long> {
    List<LearningEnrollment> findAllByOrderByUpdatedAtDesc();

    List<LearningEnrollment> findByEmployeeEmailIgnoreCaseOrderByUpdatedAtDesc(String employeeEmail);

    java.util.Optional<LearningEnrollment> findFirstByEmployeeEmailIgnoreCaseAndLearningTitleIgnoreCase(
            String employeeEmail, String learningTitle);
}
