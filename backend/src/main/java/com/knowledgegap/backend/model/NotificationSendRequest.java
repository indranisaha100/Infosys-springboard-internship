package com.knowledgegap.backend.model;

import java.util.Map;

public record NotificationSendRequest(
        String title,
        String message,
        String recipientEmail,
        Boolean allRecipients,
        String type,
        Map<String, Object> metadata) {
}
