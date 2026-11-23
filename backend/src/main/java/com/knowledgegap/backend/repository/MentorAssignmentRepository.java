package com.knowledgegap.backend.repository;

import com.knowledgegap.backend.model.MentorAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MentorAssignmentRepository extends JpaRepository<MentorAssignment, Long> {
    List<MentorAssignment> findAllByOrderByCreatedAtDesc();

    List<MentorAssignment> findByMentorEmailIgnoreCaseAndStatus(String mentorEmail, String status);

    List<MentorAssignment> findByEmployeeEmailIgnoreCaseAndStatus(String employeeEmail, String status);

    Optional<MentorAssignment> findFirstByEmployeeEmailIgnoreCaseAndMentorEmailIgnoreCaseAndSubjectIgnoreCaseAndStatus(
            String employeeEmail, String mentorEmail, String subject, String status);
}
