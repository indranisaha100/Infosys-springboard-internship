package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.model.AssessmentScore;
import com.knowledgegap.backend.model.RecommendationScoresRequest;
import com.knowledgegap.backend.repository.AssessmentScoreRepository;
import com.knowledgegap.backend.repository.UserRepository;
import com.knowledgegap.backend.security.JwtTokenProvider;
import com.knowledgegap.backend.service.GeminiRecommendationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.time.Instant;

@RestController
@RequestMapping("/api/employee")
public class EmployeeController {
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final GeminiRecommendationService geminiRecommendationService;
    private final AssessmentScoreRepository assessmentScoreRepository;

    public EmployeeController(UserRepository userRepository, JwtTokenProvider jwtTokenProvider,
            GeminiRecommendationService geminiRecommendationService,
            AssessmentScoreRepository assessmentScoreRepository) {
        this.userRepository = userRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.geminiRecommendationService = geminiRecommendationService;
        this.assessmentScoreRepository = assessmentScoreRepository;
    }

    @PostMapping("/assessments")
    public ResponseEntity<?> saveAssessment(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody(required = false) RecommendationScoresRequest request) {
        Optional<User> user = authenticatedUser(authorization);
        if (user.isEmpty()) return unauthorized();
        if (request == null || request.getScores() == null || request.getScores().isEmpty()
                || request.getScores().stream().anyMatch(score -> score == null
                || score.getTopic() == null || score.getTopic().isBlank()
                || score.getTotal() <= 0 || score.getRight() < 0
                || score.getRight() > score.getTotal() || score.getTarget() < 0
                || score.getTarget() > score.getTotal())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Valid assessment scores are required."));
        }

        Instant submittedAt = Instant.now();
        List<AssessmentScore> records = request.getScores().stream().map(score -> {
            AssessmentScore record = new AssessmentScore();
            record.setEmployeeEmail(user.get().getEmail());
            record.setTopic(score.getTopic());
            record.setRightAnswers(score.getRight());
            record.setTotalQuestions(score.getTotal());
            record.setTargetAnswers(score.getTarget());
            record.setSubmittedAt(submittedAt);
            return record;
        }).toList();
        assessmentScoreRepository.saveAll(records);
        return ResponseEntity.ok(Map.of("message", "Assessment scores saved.", "submittedAt", submittedAt));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard(@RequestHeader(value = "Authorization", required = false) String authorization) {
        Optional<User> user = authenticatedUser(authorization);
        if (user.isEmpty()) return unauthorized();

        return ResponseEntity.ok(Map.of(
                "user", userSummary(user.get()),
                "readiness", Map.of("score", 78, "label", "Strong foundation", "change", "Up 6% this quarter"),
                "stats", List.of(
                        Map.of("label", "Total skills", "value", "24", "note", "Across 5 categories"),
                        Map.of("label", "Skills to improve", "value", "6", "note", "2 are high priority"),
                        Map.of("label", "Learning progress", "value", "68%", "note", "+12% this month"),
                        Map.of("label", "Completed trainings", "value", "12", "note", "3 this quarter")),
                "gaps", List.of(
                        Map.of("name", "Product", "current", 62, "required", 77),
                        Map.of("name", "Advanced", "current", 55, "required", 77),
                        Map.of("name", "Data-Informed", "current", 68, "required", 73),
                        Map.of("name", "Stakeholder", "current", 70, "required", 73)),
                "assessments", List.of(
                        assessment("PR", "Product Strategy", 78, 90, "-12%", "Medium"),
                        assessment("AD", "Advanced Prototyping", 62, 90, "-28%", "High"),
                        assessment("DA", "Data-Informed Design", 68, 85, "-17%", "Medium"),
                        assessment("ST", "Stakeholder Management", 82, 85, "-3%", "Low"))));
    }

    @PostMapping("/recommendations/skills")
    public ResponseEntity<?> recommendations(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody(required = false) RecommendationScoresRequest request) {
        Optional<User> user = authenticatedUser(authorization);
        if (user.isEmpty()) return unauthorized();
        if (request == null || request.getScores() == null || request.getScores().isEmpty()
                || request.getScores().stream().anyMatch(score -> score == null
                        || score.getTopic() == null || score.getTopic().isBlank()
                        || score.getTotal() <= 0 || score.getRight() < 0
                        || score.getRight() > score.getTotal() || score.getTarget() < 0
                        || score.getTarget() > score.getTotal())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Valid assessment topic scores are required."));
        }

        User employee = user.get();
        String employeeName = ((employee.getFirstName() == null ? "" : employee.getFirstName()) + " "
                + (employee.getLastName() == null ? "" : employee.getLastName())).trim();
        if (employeeName.isBlank()) employeeName = employee.getEmail();

        try {
            return ResponseEntity.ok(geminiRecommendationService.generateSkillRecommendations(
                    employeeName, request.getScores()));
        } catch (ResponseStatusException exception) {
            String message = exception.getReason() == null
                    ? "Recommendations could not be generated. Please try again."
                    : exception.getReason();
            return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", message));
        }
    }

    @GetMapping("/sections/{section}")
    public ResponseEntity<?> section(@PathVariable String section,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Optional<User> user = authenticatedUser(authorization);
        if (user.isEmpty()) return unauthorized();

        return switch (section.toLowerCase()) {
            case "skills" -> ResponseEntity.ok(Map.of("section", "My Skills", "message", "Your 24 tracked skills are up to date.", "items", List.of("Product Strategy", "Advanced Prototyping", "Data-Informed Design", "Stakeholder Management")));
            case "gaps" -> ResponseEntity.ok(Map.of("section", "Knowledge Gaps", "message", "You have 6 skills to improve, including 2 high-priority gaps."));
            case "learning" -> ResponseEntity.ok(Map.of("section", "Learning", "message", "Your learning progress is 68%.", "nextAction", "Continue Advanced Prototyping in Figma"));
            case "notifications" -> ResponseEntity.ok(Map.of("section", "Notifications", "message", "You have 3 unread notifications.", "items", List.of("New role assessment available", "Advanced Prototyping course updated", "Your readiness increased by 6%")));
            case "reports" -> ResponseEntity.ok(Map.of("section", "Reports", "message", "Your latest skills assessment report is ready."));
            case "profile" -> ResponseEntity.ok(Map.of("section", "My Profile", "user", userSummary(user.get())));
            case "settings" -> ResponseEntity.ok(Map.of("section", "Settings", "message", "Your workspace settings are available."));
            default -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Employee section not found."));
        };
    }

    private Optional<User> authenticatedUser(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) return Optional.empty();
        String token = authorization.substring(7);
        if (!jwtTokenProvider.validateToken(token)) return Optional.empty();
        return userRepository.findByEmail(jwtTokenProvider.getEmailFromJWT(token));
    }

    private Map<String, Object> userSummary(User user) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("email", user.getEmail());
        summary.put("firstName", user.getFirstName());
        summary.put("lastName", user.getLastName());
        summary.put("role", user.getRole());
        return summary;
    }

    private Map<String, Object> assessment(String code, String name, int current, int required, String gap, String priority) {
        return Map.of("code", code, "name", name, "current", current,
                "required", required, "gap", gap, "priority", priority);
    }

    private ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "A valid employee session is required."));
    }
}
