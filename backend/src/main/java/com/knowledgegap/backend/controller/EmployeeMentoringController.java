package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.model.MentorAssignment;
import com.knowledgegap.backend.model.MentoringSession;
import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.security.CurrentUser;
import com.knowledgegap.backend.service.MentorAssignmentService;
import com.knowledgegap.backend.service.MentoringSessionService;
import com.knowledgegap.backend.service.NotificationHelper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

/** Employee view of their mentors (with subject) and sessions, plus post-session feedback. */
@RestController
@RequestMapping("/api/employee")
public class EmployeeMentoringController {
    private final CurrentUser currentUser;
    private final MentorAssignmentService assignments;
    private final MentoringSessionService sessions;

    public EmployeeMentoringController(CurrentUser currentUser, MentorAssignmentService assignments,
            MentoringSessionService sessions) {
        this.currentUser = currentUser;
        this.assignments = assignments;
        this.sessions = sessions;
    }

    @GetMapping("/mentoring")
    public ResponseEntity<?> mentoring(@RequestHeader(value = "Authorization", required = false) String auth) {
        Optional<User> employee = employee(auth);
        if (employee.isEmpty()) return unauthorized();
        Map<String, User> byEmail = sessions.usersByEmail();

        List<Map<String, Object>> mentors = new ArrayList<>();
        for (MentorAssignment a : assignments.activeForEmployee(employee.get().getEmail())) {
            User mentor = byEmail.get(a.getMentorEmail().toLowerCase(Locale.ROOT));
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("mentorName", mentor == null ? a.getMentorEmail() : NotificationHelper.displayName(mentor));
            m.put("mentorEmail", a.getMentorEmail());
            m.put("subject", a.getSubject());
            m.put("since", a.getCreatedAt());
            m.put("notes", a.getNotes());
            mentors.add(m);
        }
        List<Map<String, Object>> rows = sessions.forEmployee(employee.get().getEmail()).stream()
                .map(s -> sessions.view(s, byEmail)).toList();
        return ResponseEntity.ok(Map.of("mentors", mentors, "sessions", rows));
    }

    /** Body: { rating: 1-5, comment? } - only after the mentor completed the session. */
    @PostMapping("/sessions/{id}/feedback")
    public ResponseEntity<?> feedback(@RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        Optional<User> employee = employee(auth);
        if (employee.isEmpty()) return unauthorized();
        if (!(body.get("rating") instanceof Number rating)) {
            return ResponseEntity.badRequest().body(Map.of("message", "A rating from 1 to 5 is required."));
        }
        try {
            MentoringSession saved = sessions.leaveFeedback(employee.get(), id, rating.intValue(),
                    body.get("comment") == null ? null : String.valueOf(body.get("comment")));
            return ResponseEntity.ok(sessions.view(saved, sessions.usersByEmail()));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", String.valueOf(e.getReason())));
        }
    }

    private Optional<User> employee(String auth) {
        return currentUser.from(auth).filter(u -> "ROLE_EMPLOYEE".equals(u.getRole()));
    }

    private ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "A valid employee session is required."));
    }
}
