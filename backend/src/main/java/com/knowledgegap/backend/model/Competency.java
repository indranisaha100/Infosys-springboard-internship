package com.knowledgegap.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "competencies", uniqueConstraints = @UniqueConstraint(columnNames = "name"))
@Getter
@Setter
@NoArgsConstructor
public class Competency {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String category;

    @Column(length = 2000)
    private String description;

    @Column(nullable = false)
    private String expectedProficiency = "Intermediate";

    @Column(nullable = false)
    private boolean active = true;
}
