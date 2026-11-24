package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.model.MentorAssignment;
import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.security.CurrentUser;
import com.knowledgegap.backend.service.LearningProgressService;
import com.knowledgegap.backend.service.MentorAssignmentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/** HR assigns an employee to a mentor for a subject (and optionally a first course). */
@RestController
@RequestMapping("/api/hr/mentor-assignments")
public class HrMentorAssignmentController {
    private final CurrentUser currentUser;
    private final MentorAssignmentService assignments;
    private final LearningProgressService learning;

    public HrMentorAssignmentController(CurrentUser currentUser, MentorAssignmentService assignments,
            LearningProgressService learning) {
        this.currentUser = currentUser;
        this.assignments = assignments;
        this.learning = learning;
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestHeader(value = "Authorization", required = false) String auth) {
        if (hr(auth).isEmpty()) return unauthorized();
        return ResponseEntity.ok(Map.of("assignments", assignments.hrView()));
    }

    /** Body: { employeeEmail, mentorEmail, subject, notes?, learningTitle?, dueDate? (yyyy-MM-dd) } */
    @PostMapping
    public ResponseEntity<?> create(@RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody Map<String, Object> body) {
        Optional<User> hr = hr(auth);
        if (hr.isEmpty()) return unauthorized();
        MentorAssignment saved;
        try {
            saved = assignments.assign(hr.get(), str(body.get("employeeEmail")), str(body.get("mentorEmail")),
                    str(body.get("subject")), str(body.get("notes")));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", String.valueOf(e.getReason())));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", saved.getId());
        result.put("message", "Employee assigned to mentor for " + saved.getSubject() + ".");

        // Optional first course. Done after the assignment is saved so a course problem
        // (e.g. already completed) never undoes the mentor assignment.
        if (!str(body.get("learningTitle")).isBlank()) {
            try {
                LocalDate due = str(body.get("dueDate")).isBlank() ? null : LocalDate.parse(str(body.get("dueDate")));
                learning.assign(hr.get(), new LearningProgressService.AssignCommand(saved.getEmployeeEmail(),
                        str(body.get("learningTitle")), saved.getMentorEmail(), saved.getSubject(), null, due, "HR_MANUAL"));
                result.put("course", "Course \"" + str(body.get("learningTitle")) + "\" assigned.");
            } catch (ResponseStatusException e) {
                result.put("courseWarning", e.getReason());
            } catch (RuntimeException e) {
                result.put("courseWarning", "The course could not be assigned (check the due date format).");
            }
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @PostMapping("/{id}/end")
    public ResponseEntity<?> end(@RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id) {
        if (hr(auth).isEmpty()) return unauthorized();
        try {
            assignments.end(id);
            return ResponseEntity.ok(Map.of("message", "Assignment ended."));
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", String.valueOf(e.getReason())));
        }
    }

    private String str(Object o) {
        return o == null ? "" : String.valueOf(o).trim();
    }

    private Optional<User> hr(String auth) {
        return currentUser.from(auth).filter(u -> "ROLE_HR".equals(u.getRole()) || "ROLE_ADMIN".equals(u.getRole()));
    }

    private ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "A valid HR session is required."));
    }
}
