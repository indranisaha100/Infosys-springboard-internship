package com.knowledgegap.backend.repository;

import com.knowledgegap.backend.model.MentoringSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MentoringSessionRepository extends JpaRepository<MentoringSession, Long> {
    List<MentoringSession> findByMentorEmailIgnoreCaseOrderByScheduledAtAsc(String mentorEmail);

    List<MentoringSession> findByEmployeeEmailIgnoreCaseOrderByScheduledAtAsc(String employeeEmail);
}
