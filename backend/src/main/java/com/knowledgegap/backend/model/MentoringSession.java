package com.knowledgegap.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** A scheduled 1:1 between a mentor and one mentee. The Google Meet link is stored on the row. */
@Entity
@Table(name = "mentoring_sessions")
@Getter
@Setter
@NoArgsConstructor
public class MentoringSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String mentorEmail;

    @Column(nullable = false)
    private String employeeEmail;

    private String subject;

    @Column(nullable = false)
    private String title;

    @Column(length = 2000)
    private String agenda;

    @Column(nullable = false)
    private Instant scheduledAt;

    @Column(nullable = false)
    private int durationMinutes = 30;

    /** https://meet.google.com/xxx-xxxx-xxx - validated on save. */
    @Column(length = 500)
    private String meetLink;

    @Column(nullable = false)
    private String status = "SCHEDULED"; // SCHEDULED | COMPLETED | CANCELLED

    /** Written by the mentor after the session. */
    @Column(length = 4000)
    private String mentorNotes;

    /** Written by the employee after the session. */
    private Integer employeeRating;
    @Column(length = 1000)
    private String employeeFeedback;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();
}
