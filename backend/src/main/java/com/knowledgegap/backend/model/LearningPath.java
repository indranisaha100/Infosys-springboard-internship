package com.knowledgegap.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "learning_paths")
@Getter
@Setter
@NoArgsConstructor
public class LearningPath {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(length = 2000)
    private String description;

    private String competency;
    private String targetProficiency;
    private Integer durationMinutes;

    @Column(nullable = false)
    private boolean active = true;
}
