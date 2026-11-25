package com.knowledgegap.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "departments", uniqueConstraints = @UniqueConstraint(columnNames = "name"))
@Getter
@Setter
@NoArgsConstructor
public class Department {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(length = 1000)
    private String description;

    /** Email of the approved Department Head responsible for this department (optional). */
    private String headEmail;
}
