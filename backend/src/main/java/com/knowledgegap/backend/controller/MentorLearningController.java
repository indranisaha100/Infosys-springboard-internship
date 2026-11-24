package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.security.CurrentUser;
import com.knowledgegap.backend.service.MentorDashboardService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

/** Live learning progress of every employee the mentor mentors (HR-assigned or accepted). */
@RestController
@RequestMapping("/api/mentor/learning")
public class MentorLearningController {
    private final CurrentUser currentUser;
    private final MentorDashboardService dashboard;

    public MentorLearningController(CurrentUser currentUser, MentorDashboardService dashboard) {
        this.currentUser = currentUser;
        this.dashboard = dashboard;
    }

    @GetMapping("/mentees")
    public ResponseEntity<?> mentees(@RequestHeader(value = "Authorization", required = false) String auth) {
        Optional<User> mentor = currentUser.from(auth).filter(u -> "ROLE_MENTOR".equals(u.getRole()));
        if (mentor.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "A valid mentor session is required."));
        }
        return ResponseEntity.ok(Map.of("enrollments", dashboard.learningRows(mentor.get())));
    }
}
