package com.knowledgegap.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Sends tiny "something changed" signals to ONE specific user's private queue.
 *
 * Message text never travels through the broker: the signal only carries the conversation id.
 * The browser reacts by calling the REST API, which re-checks that the caller really is a
 * participant of that conversation before returning anything.
 */
@Service
public class ChatPushService {

    private static final Logger log = LoggerFactory.getLogger(ChatPushService.class);
    private static final String QUEUE = "/queue/chat";

    private final SimpMessagingTemplate template;

    public ChatPushService(SimpMessagingTemplate template) {
        this.template = template;
    }

    /** A new message (or attachment) was saved: tell the other participant. */
    public void newMessage(Long conversationId, String recipientEmail) {
        push(recipientEmail, Map.<String, Object>of("type", "MESSAGE", "conversationId", conversationId));
    }

    /** The reader opened the chat: tell the sender so "Sent" can become "Seen". */
    public void conversationRead(Long conversationId, String senderEmail) {
        push(senderEmail, Map.<String, Object>of("type", "READ", "conversationId", conversationId));
    }

    /** Mentorship requests or connections changed: the user's contact lists are out of date. */
    public void refresh(String email) {
        push(email, Map.<String, Object>of("type", "REFRESH"));
    }

    // Best-effort: if the user is offline or the push fails, the REST API (and the page's
    // fallback polling) still delivers everything, so a failure here must never break a request.
    private void push(String email, Map<String, Object> payload) {
        if (email == null || email.isBlank()) {
            return;
        }
        try {
            template.convertAndSendToUser(email, QUEUE, payload);
        } catch (RuntimeException exception) {
            log.warn("Chat push to {} failed: {}", email, exception.getMessage());
        }
    }
}
