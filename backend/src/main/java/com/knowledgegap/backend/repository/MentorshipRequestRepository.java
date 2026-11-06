// MentorshipRequestRepository.java
package com.knowledgegap.backend.repository;
import com.knowledgegap.backend.model.MentorshipRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MentorshipRequestRepository extends JpaRepository<MentorshipRequest, Long> {
    List<MentorshipRequest> findByEmployeeEmailAndMentorEmail(String employeeEmail, String mentorEmail);
    List<MentorshipRequest> findByMentorEmailAndStatus(String mentorEmail, String status);
}
