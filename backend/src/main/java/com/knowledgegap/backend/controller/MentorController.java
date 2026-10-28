package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.repository.UserRepository;
import com.knowledgegap.backend.repository.AssessmentScoreRepository;
import com.knowledgegap.backend.model.AssessmentScore;
import com.knowledgegap.backend.security.JwtTokenProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Comparator;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.LinkedHashMap;

@RestController
@RequestMapping("/api/mentor")
public class MentorController {
        private final UserRepository userRepository;
        private final JwtTokenProvider jwtTokenProvider;
        private final AssessmentScoreRepository assessmentScoreRepository;

        public MentorController(UserRepository userRepository, JwtTokenProvider jwtTokenProvider,
                        AssessmentScoreRepository assessmentScoreRepository) {
                this.userRepository = userRepository;
                this.jwtTokenProvider = jwtTokenProvider;
                this.assessmentScoreRepository = assessmentScoreRepository;
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
                if (authenticatedMentor(authorization).isEmpty()) {
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
                        case "recommendations" -> ResponseEntity.ok(Map.of("section", "Learning Recommendations",
                                        "message", "Assign recommendations after reviewing an employee's assessment.",
                                        "employees", employees));
                        case "sessions" -> ResponseEntity.ok(Map.of("section", "Mentoring Sessions",
                                        "message", "No mentoring sessions have been scheduled yet.", "employees",
                                        employees));
                        case "reports" -> ResponseEntity.ok(Map.of("section", "Reports", "message",
                                        "Reports are generated from live employee assessment data.", "employees",
                                        employees));
                        case "settings" -> ResponseEntity.ok(Map.of("section", "Settings", "message",
                                        "Mentor workspace settings are available for this account."));
                        default -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                                        .body(Map.of("message", "Mentor section not found."));
                };
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
