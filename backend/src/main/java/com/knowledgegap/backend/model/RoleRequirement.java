package com.knowledgegap.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "role_requirements")
@Getter
@Setter
@NoArgsConstructor
public class RoleRequirement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String roleName;

    @Column(nullable = false)
    private String competency;

    @Column(nullable = false)
    private String requiredProficiency = "Intermediate";
}
