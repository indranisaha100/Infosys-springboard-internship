package com.knowledgegap.backend.repository;

import com.knowledgegap.backend.model.MentorshipRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MentorshipRequestRepository extends JpaRepository<MentorshipRequest, Long> {
    List<MentorshipRequest> findByEmployeeEmailOrMentorEmailOrderByCreatedAtDesc(String employeeEmail, String mentorEmail);
}
