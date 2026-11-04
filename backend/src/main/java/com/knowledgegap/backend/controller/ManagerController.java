package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.model.AssessmentScore;
import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.AssessmentScoreRepository;
import com.knowledgegap.backend.repository.UserRepository;
import com.knowledgegap.backend.security.JwtTokenProvider;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/manager")
public class ManagerController {
    private final UserRepository users;
    private final AssessmentScoreRepository scores;
    private final JwtTokenProvider tokens;

    public ManagerController(UserRepository users, AssessmentScoreRepository scores, JwtTokenProvider tokens) {
        this.users = users;
        this.scores = scores;
        this.tokens = tokens;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard(@RequestHeader(value = "Authorization", required = false) String auth) {
        if (manager(auth).isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "A valid manager session is required."));
        List<User> employees = users.findByRole("ROLE_EMPLOYEE");
        List<AssessmentScore> assessments = scores.findAllByOrderBySubmittedAtDesc();
        long critical = assessments.stream().filter(score -> score.getRightAnswers() < score.getTargetAnswers()).count();
        return ResponseEntity.ok(Map.of(
                "stats", List.of(
                        stat("Team members", employees.size(), "Employees available to your team"),
                        stat("Pending assessments", employees.size() - distinctEmployees(assessments), "Awaiting a first assessment"),
                        stat("Critical gaps", critical, "Latest assessment scores below target"),
                        stat("Learning progress", "N/A", "Learning records are not configured")),
                "employees", employees.stream().map(this::summary).toList(),
                "assessments", assessments.stream().limit(20).map(this::assessment).toList()));
    }

    private Optional<User> manager(String auth) {
        if (auth == null || !auth.startsWith("Bearer ")) return Optional.empty();
        String token = auth.substring(7);
        if (!tokens.validateToken(token)) return Optional.empty();
        try {
            return users.findByEmail(tokens.getEmailFromJWT(token)).filter(user -> "ROLE_MANAGER".equals(user.getRole()));
        } catch (RuntimeException exception) {
            return Optional.empty();
        }
    }

    private long distinctEmployees(List<AssessmentScore> assessments) {
        return assessments.stream().map(AssessmentScore::getEmployeeEmail).distinct().count();
    }

    private Map<String, Object> summary(User user) {
        return Map.of("id", user.getId(), "name", (user.getFirstName() + " " + user.getLastName()).trim(),
                "email", user.getEmail(), "department", "Assigned team");
    }

    private Map<String, Object> assessment(AssessmentScore score) {
        return Map.of("employeeEmail", score.getEmployeeEmail(), "topic", score.getTopic(),
                "score", score.getRightAnswers(), "target", score.getTargetAnswers(), "submittedAt", score.getSubmittedAt());
    }

    private Map<String, Object> stat(String label, Object value, String note) {
        return Map.of("label", label, "value", value, "note", note);
    }
}
