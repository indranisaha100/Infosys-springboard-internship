package com.knowledgegap.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "generated_skill_programs")
@Getter
@Setter
@NoArgsConstructor
public class GeneratedSkillProgram {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long employeeId;

    @Column(nullable = false)
    private String employeeEmail;

    private Long mentorId;
    private String mentorEmail;

    @Column(nullable = false)
    private String competency;

    @Column(nullable = false)
    private int currentScore;

    @Column(nullable = false)
    private int targetScore;

    @Column(nullable = false)
    private int gapPercent;

    @Column(nullable = false)
    private String learningTitle;

    @Column(nullable = false)
    private String status = "ACTIVE";

    @Column(nullable = false)
    private Instant createdAt = Instant.now();
}
