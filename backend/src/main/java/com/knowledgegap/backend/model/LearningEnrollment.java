package com.knowledgegap.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

/**
 * One course/plan assigned to one employee. This single row is the source of truth that the
 * employee, mentor, HR and department-head dashboards all read from.
 *
 * Status lifecycle (see LearningProgressService): PENDING -> IN_PROGRESS -> COMPLETED
 * driven only by progressPercent: 0 = PENDING, 1..99 = IN_PROGRESS, 100 = COMPLETED.
 */
@Entity
@Table(name = "learning_enrollments")
@Getter
@Setter
@NoArgsConstructor
public class LearningEnrollment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String employeeEmail;

    @Column(nullable = false)
    private String learningTitle;

    private String mentorEmail;

    @Column(nullable = false)
    private String status = "PENDING";

    @Column(nullable = false)
    private int progressPercent;

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    // ---- new, all nullable so ddl-auto=update can add them to existing rows ----
    private Long resourceId;          // optional link to learning_resources.id
    private String competency;        // e.g. "Java" - lets assessments close the loop
    private String assignedBy;        // HR email (or "SYSTEM" for generated skill-gap plans)
    private String source;            // HR_MANUAL | SKILL_GAP_PLAN
    private Instant assignedAt;
    private Instant startedAt;
    private Instant completedAt;
    private LocalDate dueDate;

    @Column(length = 1000)
    private String lastNote;          // last note the employee left with a progress update
}
