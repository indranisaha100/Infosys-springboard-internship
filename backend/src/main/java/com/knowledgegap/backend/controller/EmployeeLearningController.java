package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.model.LearningEnrollment;
import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.security.CurrentUser;
import com.knowledgegap.backend.service.LearningProgressService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Employee-facing learning tracking. Ownership is enforced in the service (id + employee email). */
@RestController
@RequestMapping("/api/employee/learning")
public class EmployeeLearningController {
    private final CurrentUser currentUser;
    private final LearningProgressService learning;

    public EmployeeLearningController(CurrentUser currentUser, LearningProgressService learning) {
        this.currentUser = currentUser;
        this.learning = learning;
    }

    @GetMapping("/enrollments")
    public ResponseEntity<?> mine(@RequestHeader(value = "Authorization", required = false) String auth) {
        Optional<User> employee = employee(auth);
        if (employee.isEmpty()) return unauthorized();
        List<Map<String, Object>> items = learning.forEmployee(employee.get().getEmail()).stream()
                .map(learning::toView).toList();
        return ResponseEntity.ok(Map.of("enrollments", items));
    }

    /** Body: { "progressPercent": 0-100, "note": "optional" } */
    @PatchMapping("/enrollments/{id}/progress")
    public ResponseEntity<?> updateProgress(@RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        Optional<User> employee = employee(auth);
        if (employee.isEmpty()) return unauthorized();
        Object raw = body.get("progressPercent");
        if (!(raw instanceof Number number)) {
            return ResponseEntity.badRequest().body(Map.of("message", "progressPercent is required."));
        }
        try {
            LearningEnrollment saved = learning.updateProgress(employee.get(), id, number.intValue(),
                    body.get("note") == null ? null : String.valueOf(body.get("note")));
            return ResponseEntity.ok(learning.toView(saved));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", String.valueOf(e.getReason())));
        }
    }

    /** One-tap "Mark as completed". */
    @PostMapping("/enrollments/{id}/complete")
    public ResponseEntity<?> complete(@RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id, @RequestBody(required = false) Map<String, Object> body) {
        Optional<User> employee = employee(auth);
        if (employee.isEmpty()) return unauthorized();
        try {
            LearningEnrollment saved = learning.updateProgress(employee.get(), id, 100,
                    body == null || body.get("note") == null ? null : String.valueOf(body.get("note")));
            return ResponseEntity.ok(learning.toView(saved));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", String.valueOf(e.getReason())));
        }
    }

    private Optional<User> employee(String auth) {
        return currentUser.from(auth).filter(u -> "ROLE_EMPLOYEE".equals(u.getRole()));
    }

    private ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "A valid employee session is required."));
    }
}
