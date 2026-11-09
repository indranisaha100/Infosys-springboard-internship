package com.knowledgegap.backend.repository;

import com.knowledgegap.backend.model.HrNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HrNotificationRepository extends JpaRepository<HrNotification, Long> {
    List<HrNotification> findAllByOrderBySentAtDesc();
}
