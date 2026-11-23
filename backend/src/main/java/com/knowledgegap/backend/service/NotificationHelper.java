package com.knowledgegap.backend.service;

import com.knowledgegap.backend.model.HrNotification;
import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.HrNotificationRepository;
import org.springframework.stereotype.Component;

import java.time.Instant;

/** Writes in-app notifications using the same convention as NotificationController. */
@Component
public class NotificationHelper {
    private final HrNotificationRepository notifications;

    public NotificationHelper(HrNotificationRepository notifications) {
        this.notifications = notifications;
    }

    public void send(User recipient, String type, String title, String message) {
        if (recipient == null) return;
        HrNotification n = new HrNotification();
        n.setTitle(title);
        n.setMessage(message.length() > 4000 ? message.substring(0, 4000) : message);
        n.setAudience(recipient.getRole());
        n.setRecipientEmail(recipient.getEmail());
        n.setRecipientRole(recipient.getRole());
        n.setSenderRole("SYSTEM");
        n.setNotificationType(type);
        n.setSentAt(Instant.now());
        notifications.save(n);
    }

    public static String displayName(User user) {
        if (user == null) return "";
        String name = ((user.getFirstName() == null ? "" : user.getFirstName()) + " "
                + (user.getLastName() == null ? "" : user.getLastName())).trim();
        return name.isBlank() ? user.getEmail() : name;
    }
}
