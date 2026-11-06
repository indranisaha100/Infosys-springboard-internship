// MentorshipRequest.java
package com.knowledgegap.backend.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "mentorship_requests")
@Getter @Setter @NoArgsConstructor
public class MentorshipRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String employeeEmail;
    @Column(nullable = false)
    private String mentorEmail;
    @Column(length = 500, nullable = false)
    private String skillGoal;
    @Column(nullable = false)
    private String status; // PENDING, ACCEPTED, DECLINED
    @Column(nullable = false)
    private Instant createdAt;
}