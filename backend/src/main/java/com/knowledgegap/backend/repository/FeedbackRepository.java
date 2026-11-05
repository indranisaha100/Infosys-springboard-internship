package com.knowledgegap.backend.repository;

import com.knowledgegap.backend.model.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    List<Feedback> findAllByOrderBySubmittedAtDesc();
    List<Feedback> findByEmployeeEmailOrderBySubmittedAtDesc(String employeeEmail);
}
