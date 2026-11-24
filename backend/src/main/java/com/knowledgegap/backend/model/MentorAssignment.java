package com.knowledgegap.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * HR's decision "this employee is mentored by this mentor for this subject".
 * Creating one also creates an ACCEPTED MentorshipRequest, which is what chat, the employee's
 * mentor list and the department-head dashboard already use - so nothing else needs to change.
 */
@Entity
@Table(name = "mentor_assignments")
@Getter
@Setter
@NoArgsConstructor
public class MentorAssignment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String employeeEmail;

    @Column(nullable = false)
    private String mentorEmail;

    /** Subject / competency the mentor is responsible for, e.g. "Java". */
    @Column(nullable = false)
    private String subject;

    @Column(length = 1000)
    private String notes;

    private String assignedBy;

    @Column(nullable = false)
    private String status = "ACTIVE"; // ACTIVE | ENDED

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    private Instant endedAt;
}
