package com.knowledgegap.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "training_programmes")
@Getter
@Setter
@NoArgsConstructor
public class TrainingProgramme {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(length = 2000)
    private String description;

    private String department;
    private String competency;
    private String mentorEmail;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer participantLimit;

    @Column(nullable = false)
    private String status = "Upcoming";
}
