package com.knowledgegap.backend.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledgegap.backend.model.AssessmentScore;
import com.knowledgegap.backend.model.EmployeeNotificationRead;
import com.knowledgegap.backend.model.HrNotification;
import com.knowledgegap.backend.model.NotificationSendRequest;
import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.AssessmentScoreRepository;
import com.knowledgegap.backend.repository.EmployeeNotificationReadRepository;
import com.knowledgegap.backend.repository.HrNotificationRepository;
import com.knowledgegap.backend.repository.UserRepository;
import com.knowledgegap.backend.security.JwtTokenProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.HashSet;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private static final Set<String> ACTIVE_ROLES = Set.of(
            "ROLE_EMPLOYEE", "ROLE_MENTOR", "ROLE_MANAGER",
            "ROLE_DEPARTMENT_HEAD", "ROLE_HR", "ROLE_ADMIN");

    private final HrNotificationRepository notifications;
    private final EmployeeNotificationReadRepository reads;
    private final UserRepository users;
    private final JwtTokenProvider tokens;
    private final AssessmentScoreRepository assessments;
    private final ObjectMapper objectMapper;

    public NotificationController(
            HrNotificationRepository notifications,
            EmployeeNotificationReadRepository reads,
            UserRepository users,
            JwtTokenProvider tokens,
            AssessmentScoreRepository assessments,
            ObjectMapper objectMapper) {
        this.notifications = notifications;
        this.reads = reads;
        this.users = users;
        this.tokens = tokens;
        this.assessments = assessments;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestHeader(value = "Authorization", required = false) String authorization) {
        Optional<User> optionalUser = authenticatedUser(authorization);
        if (optionalUser.isEmpty()) return unauthorized();
        User user = optionalUser.get();

        List<HrNotification> visible = visibleTo(user);
        Set<Long> ids = visible.stream().map(HrNotification::getId).collect(Collectors.toSet());
        List<EmployeeNotificationRead> readRecords = ids.isEmpty()
                ? List.of()
                : reads.findByEmployeeEmailAndNotificationIdIn(user.getEmail(), ids);
        Map<Long, Instant> readAtById = readRecords
                .stream()
                .collect(Collectors.toMap(
                        EmployeeNotificationRead::getNotificationId,
                        EmployeeNotificationRead::getReadAt,
                        (first, ignored) -> first));

        List<Map<String, Object>> result = visible.stream().map(notification -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", notification.getId());
            item.put("title", notification.getTitle());
            item.put("message", notification.getMessage());
            item.put("senderEmail", notification.getSenderEmail());
            item.put("senderRole", notification.getSenderRole());
            item.put("recipientEmail", notification.getRecipientEmail());
            item.put("recipientRole", notification.getRecipientRole());
            item.put("type", notification.getNotificationType());
            item.put("metadata", notification.getMetadataJson());
            item.put("sentAt", notification.getSentAt());
            Instant readAt = readAtById.get(notification.getId());
            item.put("readAt", readAt);
            item.put("isRead", readAt != null);
            return item;
        }).toList();

        return ResponseEntity.ok(result);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> unreadCount(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Optional<User> user = authenticatedUser(authorization);
        if (user.isEmpty()) return unauthorized();

        List<HrNotification> visible = visibleTo(user.get());
        Set<Long> ids = visible.stream().map(HrNotification::getId).collect(Collectors.toSet());
        List<EmployeeNotificationRead> readRecords = ids.isEmpty()
                ? List.of()
                : reads.findByEmployeeEmailAndNotificationIdIn(user.get().getEmail(), ids);
        Set<Long> readIds = new HashSet<>(readRecords.stream()
                .map(EmployeeNotificationRead::getNotificationId)
                .toList());
        return ResponseEntity.ok(Map.of("count",
                visible.stream().filter(notification -> !readIds.contains(notification.getId())).count()));
    }

    @PostMapping("/{notificationId}/read")
    public ResponseEntity<?> markRead(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Long notificationId) {
        Optional<User> user = authenticatedUser(authorization);
        if (user.isEmpty()) return unauthorized();

        boolean visible = visibleTo(user.get()).stream()
                .anyMatch(notification -> notification.getId().equals(notificationId));
        if (!visible) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Notification not found."));
        }

        List<EmployeeNotificationRead> existing = reads.findByEmployeeEmailAndNotificationIdIn(
                user.get().getEmail(), List.of(notificationId));
        if (existing.isEmpty()) {
            reads.save(new EmployeeNotificationRead(user.get().getEmail(), notificationId));
        }
        return ResponseEntity.ok(Map.of("message", "Notification marked as read."));
    }

    @PostMapping("/send")
    public ResponseEntity<?> send(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody NotificationSendRequest request) throws JsonProcessingException {
        Optional<User> optionalSender = authenticatedUser(authorization);
        if (optionalSender.isEmpty()) return unauthorized();
        User sender = optionalSender.get();

        if (request == null || blank(request.title()) || blank(request.message())) {
            return badRequest("A title and message are required.");
        }
        if (request.title().trim().length() > 255 || request.message().trim().length() > 4000
                || (!blank(request.type()) && request.type().trim().length() > 80)) {
            return badRequest("Title, message, or notification type exceeds the allowed length.");
        }
        if (!Set.of("ROLE_MANAGER", "ROLE_DEPARTMENT_HEAD", "ROLE_HR", "ROLE_ADMIN")
                .contains(sender.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "You are not allowed to send notifications."));
        }

        List<User> recipients = resolveRecipients(sender, request);
        if (recipients == null || recipients.isEmpty()) {
            return badRequest("Choose a valid, approved recipient for this notification.");
        }

        String metadataJson = request.metadata() == null || request.metadata().isEmpty()
                ? null
                : objectMapper.writeValueAsString(request.metadata());
        if (metadataJson != null && metadataJson.length() > 4000) {
            return badRequest("Notification metadata exceeds the allowed length.");
        }
        Instant sentAt = Instant.now();
        List<HrNotification> records = new ArrayList<>();
        for (User recipient : recipients) {
            HrNotification notification = new HrNotification();
            notification.setTitle(request.title().trim());
            notification.setMessage(request.message().trim());
            notification.setAudience(recipient.getRole());
            notification.setRecipientEmail(recipient.getEmail());
            notification.setRecipientRole(recipient.getRole());
            notification.setSenderEmail(sender.getEmail());
            notification.setSenderRole(sender.getRole());
            notification.setNotificationType(blank(request.type()) ? "MESSAGE" : request.type().trim());
            notification.setMetadataJson(metadataJson);
            notification.setSentAt(sentAt);
            records.add(notification);
        }

        List<HrNotification> saved = notifications.saveAll(records);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("sentCount", saved.size(), "message", "Notification sent."));
    }

    private List<User> resolveRecipients(User sender, NotificationSendRequest request) {
        boolean hr = "ROLE_HR".equals(sender.getRole()) || "ROLE_ADMIN".equals(sender.getRole());
        if (Boolean.TRUE.equals(request.allRecipients())) {
            if (!hr) return List.of();
            return users.findAll().stream()
                    .filter(this::isApproved)
                    .filter(user -> ACTIVE_ROLES.contains(user.getRole()))
                    .toList();
        }

        if (blank(request.recipientEmail())) return List.of();
        Optional<User> optionalRecipient = users.findByEmailIgnoreCase(request.recipientEmail().trim());
        if (optionalRecipient.isEmpty() || !isApproved(optionalRecipient.get())) return List.of();
        User recipient = optionalRecipient.get();

        if (hr) return List.of(recipient);
        if ("ROLE_MANAGER".equals(sender.getRole())) {
            if ("ROLE_EMPLOYEE".equals(recipient.getRole())) {
                return hasCriticalGap(recipient.getEmail()) ? List.of(recipient) : List.of();
            }
            return "ROLE_MENTOR".equals(recipient.getRole()) ? List.of(recipient) : List.of();
        }
        if ("ROLE_DEPARTMENT_HEAD".equals(sender.getRole())) {
            boolean eligibleRole = "ROLE_EMPLOYEE".equals(recipient.getRole())
                    || "ROLE_MENTOR".equals(recipient.getRole());
            return eligibleRole && sameDepartment(sender.getDepartment(), recipient.getDepartment())
                    ? List.of(recipient) : List.of();
        }
        return List.of();
    }

    private boolean hasCriticalGap(String employeeEmail) {
        Map<String, AssessmentScore> latestByTopic = new LinkedHashMap<>();
        for (AssessmentScore score : assessments.findByEmployeeEmailOrderBySubmittedAtDesc(employeeEmail)) {
            String topic = safe(score.getTopic()).toLowerCase(Locale.ROOT);
            latestByTopic.putIfAbsent(topic, score);
        }
        return latestByTopic.values().stream()
                .filter(score -> score.getTotalQuestions() > 0)
                .anyMatch(score -> score.getRightAnswers() * 100.0 / score.getTotalQuestions() < 40.0);
    }

    private List<HrNotification> visibleTo(User user) {
        String normalizedEmail = user.getEmail().toLowerCase(Locale.ROOT);
        String roleName = user.getRole().replace("ROLE_", "").toLowerCase(Locale.ROOT);
        return notifications.findAllByOrderBySentAtDesc().stream()
                .filter(notification -> {
                    if (!blank(notification.getRecipientEmail())) {
                        return normalizedEmail.equals(notification.getRecipientEmail().toLowerCase(Locale.ROOT));
                    }
                    return audienceMatches(notification.getAudience(), roleName);
                })
                .sorted(Comparator.comparing(HrNotification::getSentAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    private boolean audienceMatches(String audience, String roleName) {
        if (blank(audience)) return true;
        String normalized = audience.toLowerCase(Locale.ROOT).replace('_', ' ').replace('-', ' ');
        return normalized.contains("all") || normalized.contains(roleName.replace('_', ' '))
                || ("department head".equals(roleName) && normalized.contains("department head"));
    }

    private boolean isApproved(User user) {
        return blank(user.getStatus()) || "APPROVED".equalsIgnoreCase(user.getStatus());
    }

    private boolean sameDepartment(String first, String second) {
        return !blank(first) && !blank(second) && first.trim().equalsIgnoreCase(second.trim());
    }

    private Optional<User> authenticatedUser(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) return Optional.empty();
        String token = authorization.substring(7);
        if (!tokens.validateToken(token)) return Optional.empty();
        return users.findByEmail(tokens.getEmailFromJWT(token))
                .filter(this::isApproved)
                .filter(user -> user.getRole() != null && ACTIVE_ROLES.contains(user.getRole()));
    }

    private ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "A valid session is required."));
    }

    private ResponseEntity<Map<String, String>> badRequest(String message) {
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
