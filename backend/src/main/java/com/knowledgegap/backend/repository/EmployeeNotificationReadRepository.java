package com.knowledgegap.backend.repository;

import com.knowledgegap.backend.model.EmployeeNotificationRead;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface EmployeeNotificationReadRepository extends JpaRepository<EmployeeNotificationRead, Long> {
    List<EmployeeNotificationRead> findByEmployeeEmailAndNotificationIdIn(
            String employeeEmail, Collection<Long> notificationIds);
}
