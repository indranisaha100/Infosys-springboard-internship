package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.model.AssessmentScore;
import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.AssessmentScoreRepository;
import com.knowledgegap.backend.repository.UserRepository;
import com.knowledgegap.backend.security.JwtTokenProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/hr")
public class HrController {
    private final UserRepository userRepository;
    private final AssessmentScoreRepository assessmentScoreRepository;
    private final JwtTokenProvider jwtTokenProvider;

    public HrController(UserRepository userRepository, AssessmentScoreRepository assessmentScoreRepository,
            JwtTokenProvider jwtTokenProvider) {
        this.userRepository = userRepository;
        this.assessmentScoreRepository = assessmentScoreRepository;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Optional<User> hr = authenticatedHr(authorization);
        if (hr.isEmpty()) {
            return unauthorized();
        }

        List<User> employees = userRepository.findByRole("ROLE_EMPLOYEE");
        List<AssessmentScore> scores = assessmentScoreRepository.findAll();
        List<Map<String, Object>> employeeSummaries = employees.stream()
                .sorted(Comparator.comparing(this::displayName))
                .map(this::employeeSummary)
                .toList();
        List<Map<String, Object>> gaps = skillGaps(scores);
        long departments = employees.stream()
                .map(user -> "Unassigned")
                .distinct()
                .count();

        return ResponseEntity.ok(Map.of(
                "stats", List.of(
                        stat("Total Employees", employees.size(), "From the employee directory"),
                        stat("Total Departments", departments, "Department data available"),
                        stat("Organisation Skill Coverage", coverage(scores), "Based on submitted assessments"),
                        stat("Critical Skill Gaps", gaps.stream().filter(gap -> ((Number) gap.get("value")).intValue() >= 50).count(),
                                "Skills at or below target"),
                        stat("Active Learning Programmes", 0, "No programme records available"),
                        stat("Learning Participation", "N/A", "Learning records are not configured"),
                        stat("Training Completion Rate", "N/A", "Training records are not configured"),
                        stat("Available Mentors", userRepository.findByRole("ROLE_MENTOR").size(),
                                "From the mentor directory")),
                "employees", employeeSummaries,
                "gaps", gaps));
    }

    @GetMapping("/employees")
    public ResponseEntity<?> employees(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(defaultValue = "") String search) {
        if (authenticatedHr(authorization).isEmpty()) {
            return unauthorized();
        }

        String query = search.trim().toLowerCase(Locale.ROOT);
        List<Map<String, Object>> result = userRepository.findByRole("ROLE_EMPLOYEE").stream()
                .filter(user -> query.isBlank() || displayName(user).toLowerCase(Locale.ROOT).contains(query)
                        || user.getEmail().toLowerCase(Locale.ROOT).contains(query))
                .sorted(Comparator.comparing(this::displayName))
                .map(this::employeeSummary)
                .toList();
        return ResponseEntity.ok(Map.of("employees", result, "total", result.size()));
    }

    private List<Map<String, Object>> skillGaps(List<AssessmentScore> scores) {
        Map<String, AssessmentScore> latestByEmployeeAndTopic = scores.stream()
                .collect(Collectors.toMap(
                        score -> score.getEmployeeEmail() + "::" + score.getTopic(),
                        Function.identity(),
                        (first, second) -> first.getSubmittedAt().isAfter(second.getSubmittedAt()) ? first : second));

        Map<String, List<AssessmentScore>> byTopic = latestByEmployeeAndTopic.values().stream()
                .collect(Collectors.groupingBy(AssessmentScore::getTopic, LinkedHashMap::new, Collectors.toList()));
        return byTopic.entrySet().stream()
                .map(entry -> {
                    List<AssessmentScore> topicScores = entry.getValue();
                    double current = topicScores.stream()
                            .mapToDouble(score -> percentage(score.getRightAnswers(), score.getTotalQuestions())).average()
                            .orElse(0);
                    double target = topicScores.stream()
                            .mapToDouble(score -> percentage(score.getTargetAnswers(), score.getTotalQuestions())).average()
                            .orElse(0);
                    return Map.<String, Object>of(
                            "label", entry.getKey(),
                            "value", Math.max(0, Math.round(target - current)),
                            "current", Math.round(current),
                            "target", Math.round(target));
                })
                .sorted((left, right) -> Integer.compare(
                        ((Number) right.get("value")).intValue(), ((Number) left.get("value")).intValue()))
                .toList();
    }

    private Map<String, Object> employeeSummary(User user) {
        return Map.of(
                "id", user.getId(),
                "name", displayName(user),
                "email", user.getEmail(),
                "department", "Unassigned",
                "role", "Employee",
                "status", "Assessment data available");
    }

    private Map<String, Object> stat(String label, Object value, String note) {
        return Map.of("label", label, "value", value, "note", note);
    }

    private String coverage(List<AssessmentScore> scores) {
        if (scores.isEmpty()) {
            return "N/A";
        }
        double value = scores.stream()
                .mapToDouble(score -> percentage(score.getRightAnswers(), score.getTotalQuestions()))
                .average()
                .orElse(0);
        return Math.round(value) + "%";
    }

    private double percentage(int numerator, int denominator) {
        return denominator <= 0 ? 0 : (numerator * 100.0) / denominator;
    }

    private String displayName(User user) {
        String first = user.getFirstName() == null ? "" : user.getFirstName().trim();
        String last = user.getLastName() == null ? "" : user.getLastName().trim();
        String fullName = (first + " " + last).trim();
        return fullName.isBlank() ? user.getEmail() : fullName;
    }

    private Optional<User> authenticatedHr(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return Optional.empty();
        }
        String token = authorization.substring(7);
        if (!jwtTokenProvider.validateToken(token)) {
            return Optional.empty();
        }
        try {
            return userRepository.findByEmail(jwtTokenProvider.getEmailFromJWT(token))
                    .filter(user -> "ROLE_HR".equals(user.getRole()) || "ROLE_ADMIN".equals(user.getRole()));
        } catch (RuntimeException exception) {
            return Optional.empty();
        }
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "A valid HR session is required."));
    }
}
