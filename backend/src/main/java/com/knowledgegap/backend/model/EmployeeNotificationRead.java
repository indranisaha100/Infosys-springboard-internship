package com.knowledgegap.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "employee_notification_reads",
        uniqueConstraints = @UniqueConstraint(columnNames = {"employee_email", "notification_id"}))
@Getter
@Setter
@NoArgsConstructor
public class EmployeeNotificationRead {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_email", nullable = false)
    private String employeeEmail;

    @Column(name = "notification_id", nullable = false)
    private Long notificationId;

    @Column(nullable = false)
    private Instant readAt = Instant.now();

    public EmployeeNotificationRead(String employeeEmail, Long notificationId) {
        this.employeeEmail = employeeEmail;
        this.notificationId = notificationId;
    }
}
