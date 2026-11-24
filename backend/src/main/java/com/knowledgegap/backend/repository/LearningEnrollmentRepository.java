package com.knowledgegap.backend.repository;

import com.knowledgegap.backend.model.LearningEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface LearningEnrollmentRepository extends JpaRepository<LearningEnrollment, Long> {
    List<LearningEnrollment> findAllByOrderByUpdatedAtDesc();

    List<LearningEnrollment> findByEmployeeEmailIgnoreCaseOrderByUpdatedAtDesc(String employeeEmail);

    List<LearningEnrollment> findByMentorEmailIgnoreCaseOrderByUpdatedAtDesc(String mentorEmail);

    Optional<LearningEnrollment> findFirstByEmployeeEmailIgnoreCaseAndLearningTitleIgnoreCase(
            String employeeEmail, String learningTitle);

    Optional<LearningEnrollment> findByIdAndEmployeeEmailIgnoreCase(Long id, String employeeEmail);
}
