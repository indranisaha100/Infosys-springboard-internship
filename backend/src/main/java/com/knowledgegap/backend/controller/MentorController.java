package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.repository.UserRepository;
import com.knowledgegap.backend.repository.AssessmentScoreRepository;
import com.knowledgegap.backend.repository.HrNotificationRepository;
import com.knowledgegap.backend.repository.EmployeeNotificationReadRepository;
import com.knowledgegap.backend.repository.TrainingProgrammeRepository;
import com.knowledgegap.backend.repository.LearningResourceRepository;
import com.knowledgegap.backend.repository.FeedbackRepository;
import com.knowledgegap.backend.model.HrNotification;
import com.knowledgegap.backend.model.EmployeeNotificationRead;
import com.knowledgegap.backend.model.AssessmentScore;
import com.knowledgegap.backend.security.JwtTokenProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ContentDisposition;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Comparator;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.HashSet;
import java.util.LinkedHashMap;

@RestController
@RequestMapping("/api/mentor")
public class MentorController {
        private final UserRepository userRepository;
        private final JwtTokenProvider jwtTokenProvider;
        private final AssessmentScoreRepository assessmentScoreRepository;
        private final HrNotificationRepository notificationRepository;
        private final EmployeeNotificationReadRepository notificationReadRepository;
        private final TrainingProgrammeRepository programmeRepository;
        private final LearningResourceRepository resourceRepository;
        private final FeedbackRepository feedbackRepository;

        public MentorController(UserRepository userRepository, JwtTokenProvider jwtTokenProvider,
                        AssessmentScoreRepository assessmentScoreRepository) {
                this(userRepository, jwtTokenProvider, assessmentScoreRepository, null, null, null, null, null);
        }

        @Autowired
        public MentorController(UserRepository userRepository, JwtTokenProvider jwtTokenProvider,
                        AssessmentScoreRepository assessmentScoreRepository,
                        HrNotificationRepository notificationRepository,
                        EmployeeNotificationReadRepository notificationReadRepository,
                        TrainingProgrammeRepository programmeRepository,
                        LearningResourceRepository resourceRepository,
                        FeedbackRepository feedbackRepository) {
                this.userRepository = userRepository;
                this.jwtTokenProvider = jwtTokenProvider;
                this.assessmentScoreRepository = assessmentScoreRepository;
                this.notificationRepository = notificationRepository;
                this.notificationReadRepository = notificationReadRepository;
                this.programmeRepository = programmeRepository;
                this.resourceRepository = resourceRepository;
                this.feedbackRepository = feedbackRepository;
        }

        @GetMapping("/dashboard")
        public ResponseEntity<?> dashboard(
                        @RequestHeader(value = "Authorization", required = false) String authorization) {
                Optional<com.knowledgegap.backend.model.User> mentor = authenticatedMentor(authorization);
                if (mentor.isEmpty()) {
                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                        .body(Map.of("message", "A valid mentor session is required."));
                }

                List<com.knowledgegap.backend.model.User> employees = userRepository.findByRole("ROLE_EMPLOYEE");
                List<Map<String, Object>> mentees = employees.stream()
                                .sorted(Comparator.comparing(
                                                user -> safe(user.getFirstName()) + safe(user.getLastName())))
                                .map(this::mentee)
                                .toList();
                int employeeCount = mentees.size();
                return ResponseEntity.ok(Map.of(
                                "stats", List.of(
                                                stat("Total Mentees", employeeCount, "Live employee directory", "users",
                                                                "blue"),
                                                stat("Pending Assessments", employeeCount, "Review employee progress",
                                                                "check", "amber"),
                                                stat("Knowledge Gaps Identified", employeeCount,
                                                                "Awaiting assessment data", "gap", "purple"),
                                                stat("Active Learning Plans", 0, "No plans assigned yet", "book",
                                                                "green")),
                                "mentees", mentees,
                                "gaps", List.of(
                                                gap("Java Programming", 72, "bg-blue-500"),
                                                gap("SQL and Database Management", 58, "bg-violet-500"),
                                                gap("React Development", 46, "bg-cyan-500"),
                                                gap("Cloud Computing", 38, "bg-amber-500"),
                                                gap("Communication Skills", 29, "bg-emerald-500")),
                                "recommendations", List.of(
                                                resource("Building Production APIs with Spring Boot", "Java",
                                                                "Intermediate", "6 hours", "code"),
                                                resource("SQL Performance Tuning Essentials", "SQL", "Advanced",
                                                                "4 hours", "database"),
                                                resource("Modern React State Patterns", "React", "Intermediate",
                                                                "3.5 hours", "layers")),
                                "sessions", List.of(
                                                session("Aarav Sharma", "Spring Boot architecture review",
                                                                "Oct 28, 2026", "10:00 AM"),
                                                session("Rohan Das", "React project check-in", "Oct 29, 2026",
                                                                "2:30 PM"),
                                                session("Priya Menon", "SQL learning plan", "Oct 31, 2026",
                                                                "11:00 AM")),
                                "activity", List.of(
                                                activity("Employee directory synchronized with the backend.",
                                                                "Just now", "check"),
                                                activity(employeeCount + " employees are available for mentoring.",
                                                                "Live", "users")),
                                "assessments", assessmentSummaries()));
        }

        @GetMapping("/sections/{section}")
        public ResponseEntity<?> section(@PathVariable String section,
                        @RequestHeader(value = "Authorization", required = false) String authorization) {
                Optional<com.knowledgegap.backend.model.User> mentor = authenticatedMentor(authorization);
                if (mentor.isEmpty()) {
                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                        .body(Map.of("message", "A valid mentor session is required."));
                }

                String normalized = section.toLowerCase(Locale.ROOT);
                List<Map<String, Object>> employees = userRepository.findByRole("ROLE_EMPLOYEE").stream()
                                .sorted(Comparator.comparing(
                                                user -> safe(user.getFirstName()) + safe(user.getLastName())))
                                .map(this::employeeSummary)
                                .toList();
                return switch (normalized) {
                        case "mentees" -> ResponseEntity.ok(Map.of("section", "My Mentees", "employees", employees));
                        case "gaps" -> ResponseEntity.ok(Map.of("section", "Knowledge Gaps", "message",
                                        "Knowledge gap tracking is ready for employee assessment results.", "employees",
                                        employees));
                        case "assessments" -> ResponseEntity.ok(Map.of("section", "Employee Assessments", "message",
                                        "Latest assessment scores submitted by employees.", "employees", employees,
                                        "assessments", assessmentSummaries()));
                        case "recommendations" -> ResponseEntity.ok(mentorResources("Learning Recommendations"));
                        case "resources" -> ResponseEntity.ok(mentorResources("Shared Resources"));
                        case "programmes", "training-programmes" -> ResponseEntity.ok(mentorProgrammes());
                        case "feedback" -> ResponseEntity.ok(mentorFeedback());
                        case "sessions" -> ResponseEntity.ok(Map.of("section", "Mentoring Sessions",
                                        "message", "No mentoring sessions have been scheduled yet.", "employees",
                                        employees));
                        case "notifications" -> ResponseEntity.ok(mentorNotifications(mentor.get()));
                        case "reports" -> ResponseEntity.ok(Map.of("section", "Reports", "message",
                                        "Reports are generated from live employee assessment data.", "employees",
                                        employees));
                        case "settings" -> ResponseEntity.ok(Map.of("section", "Settings", "message",
                                        "Mentor workspace settings are available for this account."));
                        default -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                                        .body(Map.of("message", "Mentor section not found."));
                };
        }

        @GetMapping("/notifications/unread-count")
        public ResponseEntity<?> unreadNotificationCount(
                        @RequestHeader(value = "Authorization", required = false) String authorization) {
                Optional<com.knowledgegap.backend.model.User> mentor = authenticatedMentor(authorization);
                if (mentor.isEmpty()) return unauthorized();
                return ResponseEntity.ok(Map.of("count", unreadNotifications(mentor.get()).size()));
        }

        @PostMapping("/notifications/read")
        public ResponseEntity<?> markNotificationsRead(
                        @RequestHeader(value = "Authorization", required = false) String authorization) {
                Optional<com.knowledgegap.backend.model.User> mentor = authenticatedMentor(authorization);
                if (mentor.isEmpty()) return unauthorized();
                List<HrNotification> visible = visibleNotifications();
                Set<Long> ids = new HashSet<>(visible.stream().map(HrNotification::getId).toList());
                Set<Long> readIds = new HashSet<>(notificationReadRepository
                                .findByEmployeeEmailAndNotificationIdIn(mentor.get().getEmail(), ids).stream()
                                .map(EmployeeNotificationRead::getNotificationId).toList());
                notificationReadRepository.saveAll(visible.stream()
                                .filter(notification -> !readIds.contains(notification.getId()))
                                .map(notification -> new EmployeeNotificationRead(mentor.get().getEmail(), notification.getId()))
                                .toList());
                return ResponseEntity.ok(Map.of("message", "Notifications marked as read."));
        }

        private Map<String, Object> mentorNotifications(com.knowledgegap.backend.model.User mentor) {
                List<String> items = visibleNotifications().stream()
                                .map(notification -> notification.getTitle() + " — " + notification.getMessage())
                                .toList();
                return Map.of("section", "Notifications",
                                "message", items.isEmpty() ? "You have no new notifications."
                                                : "You have " + items.size() + " mentor notification(s).",
                                "items", items);
        }

        private Map<String, Object> mentorResources(String section) {
                List<Map<String, Object>> items = resourceRepository == null ? List.of() : resourceRepository
                                .findByActiveTrueOrderByTitleAsc().stream()
                                .map(resource -> {
                                        Map<String, Object> item = new LinkedHashMap<>();
                                        item.put("id", resource.getId());
                                        item.put("title", resource.getTitle());
                                        item.put("category", resource.getCategory());
                                        item.put("pdfFileName", resource.getPdfFileName());
                                        item.put("pdfUrl", resource.getPdfData() == null ? null : "/mentor/resources/" + resource.getId() + "/pdf");
                                        return item;
                                })
                                .toList();
                return Map.of("section", section, "message",
                                items.isEmpty() ? "No HR learning resources are published yet."
                                                : "HR-approved learning resources available to mentors.",
                                "items", items);
        }

        @GetMapping("/resources/{id}/pdf")
        public ResponseEntity<?> downloadLearningPdf(
                        @RequestHeader(value = "Authorization", required = false) String authorization,
                        @PathVariable Long id) {
                Optional<com.knowledgegap.backend.model.User> mentor = authenticatedMentor(authorization);
                if (mentor.isEmpty()) return unauthorized();
                return resourceRepository.findById(id)
                                .filter(resource -> resource.isActive() && resource.getPdfData() != null)
                                .map(resource -> ResponseEntity.ok()
                                                .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                                                .header(HttpHeaders.CONTENT_DISPOSITION,
                                                                ContentDisposition.attachment().filename(resource.getPdfFileName()).build().toString())
                                                .body(resource.getPdfData()))
                                .orElseGet(() -> ResponseEntity.notFound().build());
        }

        private Map<String, Object> mentorProgrammes() {
                List<String> items = programmeRepository == null ? List.of() : programmeRepository
                                .findAllByOrderByStartDateAsc().stream()
                                .filter(programme -> !"CANCELLED".equalsIgnoreCase(programme.getStatus()))
                                .map(programme -> programme.getName() + " · " + programme.getStartDate()
                                                + (programme.getEndDate() == null ? "" : " to " + programme.getEndDate())
                                                + " · " + programme.getStatus())
                                .toList();
                return Map.of("section", "Training Programmes", "message",
                                items.isEmpty() ? "No training programmes are currently scheduled."
                                                : "Upcoming organisation training programmes.",
                                "items", items);
        }

        private Map<String, Object> mentorFeedback() {
                List<String> items = feedbackRepository == null ? List.of() : feedbackRepository
                                .findAllByOrderBySubmittedAtDesc().stream()
                                .map(feedback -> feedback.getEmployeeEmail() + " · " + feedback.getSubject()
                                                + " · Rating " + feedback.getRating() + "/5")
                                .toList();
                return Map.of("section", "Feedback", "message",
                                items.isEmpty() ? "No learner feedback has been submitted yet."
                                                : "Learner feedback available for programme effectiveness review.",
                                "items", items);
        }

        private List<HrNotification> visibleNotifications() {
                if (notificationRepository == null) return List.of();
                return notificationRepository.findAllByOrderBySentAtDesc().stream()
                                .filter(notification -> notification.getAudience() == null
                                                || notification.getAudience().isBlank()
                                                || notification.getAudience().toLowerCase().contains("all")
                                                || notification.getAudience().toLowerCase().contains("mentor"))
                                .toList();
        }

        private List<HrNotification> unreadNotifications(com.knowledgegap.backend.model.User mentor) {
                if (notificationReadRepository == null) return visibleNotifications();
                List<HrNotification> visible = visibleNotifications();
                Set<Long> ids = new HashSet<>(visible.stream().map(HrNotification::getId).toList());
                Set<Long> readIds = new HashSet<>(notificationReadRepository
                                .findByEmployeeEmailAndNotificationIdIn(mentor.getEmail(), ids).stream()
                                .map(EmployeeNotificationRead::getNotificationId).toList());
                return visible.stream().filter(notification -> !readIds.contains(notification.getId())).toList();
        }

        private List<Map<String, Object>> assessmentSummaries() {
                Map<String, AssessmentScore> latestByEmployeeAndTopic = new LinkedHashMap<>();
                for (AssessmentScore score : assessmentScoreRepository.findAllByOrderBySubmittedAtDesc()) {
                        latestByEmployeeAndTopic.putIfAbsent(score.getEmployeeEmail() + "|" + score.getTopic(), score);
                }

                Map<String, com.knowledgegap.backend.model.User> usersByEmail = userRepository
                                .findByRole("ROLE_EMPLOYEE")
                                .stream().collect(java.util.stream.Collectors.toMap(
                                                user -> user.getEmail().toLowerCase(Locale.ROOT), user -> user,
                                                (first, ignored) -> first));

                return latestByEmployeeAndTopic.values().stream().map(score -> {
                        com.knowledgegap.backend.model.User employee = usersByEmail
                                        .get(score.getEmployeeEmail().toLowerCase(Locale.ROOT));
                        int percentage = Math.round((score.getRightAnswers() * 100f) / score.getTotalQuestions());
                        return Map.<String, Object>of(
                                        "employee", employee == null ? score.getEmployeeEmail() : displayName(employee),
                                        "email", score.getEmployeeEmail(),
                                        "topic", score.getTopic(),
                                        "score", percentage,
                                        "right", score.getRightAnswers(),
                                        "total", score.getTotalQuestions(),
                                        "target", score.getTargetAnswers(),
                                        "submittedAt", score.getSubmittedAt().toString());
                }).toList();
        }

        private Optional<com.knowledgegap.backend.model.User> authenticatedMentor(String authorization) {
                if (authorization == null || !authorization.startsWith("Bearer "))
                        return Optional.empty();
                String token = authorization.substring(7);
                if (!jwtTokenProvider.validateToken(token))
                        return Optional.empty();
                return userRepository.findByEmail(jwtTokenProvider.getEmailFromJWT(token))
                                .filter(user -> "ROLE_MENTOR".equals(user.getRole()));
        }

        private Map<String, Object> stat(String label, int value, String note, String icon, String tone) {
                return Map.of("label", label, "value", value, "note", note, "icon", icon, "tone", tone);
        }

        private Map<String, Object> mentee(com.knowledgegap.backend.model.User user) {
                String name = displayName(user);
                return Map.of("name", name, "initials", initials(user), "department", "Employee",
                                "skill", "Not assessed", "gap", "Assessment pending", "progress", 0, "status",
                                "Needs Attention",
                                "email", safe(user.getEmail()));
        }

        private Map<String, Object> employeeSummary(com.knowledgegap.backend.model.User user) {
                return Map.of("name", displayName(user), "initials", initials(user), "email", safe(user.getEmail()),
                                "role", safe(user.getRole()));
        }

        private String displayName(com.knowledgegap.backend.model.User user) {
                String name = (safe(user.getFirstName()) + " " + safe(user.getLastName())).trim();
                return name.isBlank() ? safe(user.getEmail()) : name;
        }

        private String initials(com.knowledgegap.backend.model.User user) {
                String name = displayName(user);
                String[] parts = name.split("\\s+");
                return parts.length > 1
                                ? (parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1)).toUpperCase()
                                : name.substring(0, Math.min(2, name.length())).toUpperCase();
        }

        private String safe(String value) {
                return value == null ? "" : value;
        }

        private Map<String, Object> gap(String name, int value, String color) {
                return Map.of("name", name, "value", value, "color", color);
        }

        private Map<String, Object> resource(String title, String category, String difficulty,
                        String duration, String icon) {
                return Map.of("title", title, "category", category, "difficulty", difficulty,
                                "duration", duration, "icon", icon);
        }

        private Map<String, Object> session(String name, String topic, String date, String time) {
                return Map.of("name", name, "topic", topic, "date", date, "time", time);
        }

        private Map<String, Object> activity(String text, String time, String icon) {
                return Map.of("text", text, "time", time, "icon", icon);
        }
}
