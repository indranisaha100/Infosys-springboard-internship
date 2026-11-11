package com.knowledgegap.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    private String firstName;
    private String lastName;
    private String role = "ROLE_EMPLOYEE";

    @Column(unique = true)
    private String userId;

    private String requestedRole;
    private String department;
    @Column(length = 2000)
    private String expertise;

    private String status = "APPROVED";

    @Column(length = 1000)
    private String reviewNote;
}
