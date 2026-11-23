package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.model.LearningEnrollment;
import com.knowledgegap.backend.model.LearningResource;
import com.knowledgegap.backend.model.MentoringSession;
import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.LearningResourceRepository;
import com.knowledgegap.backend.security.CurrentUser;
import com.knowledgegap.backend.service.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Mentor-only endpoints: mentees, their learning, assigning courses and Google Meet sessions. */
@RestController
@RequestMapping("/api/mentor")
public class MentorWorkspaceController {
    private final CurrentUser currentUser;
    private final MentorDashboardService dashboard;
    private final MentorAssignmentService assignments;
    private final MentoringSessionService sessions;
    private final LearningProgressService learning;
    private final LearningResourceRepository resources;

    public MentorWorkspaceController(CurrentUser currentUser, MentorDashboardService dashboard,
            MentorAssignmentService assignments, MentoringSessionService sessions,
            LearningProgressService learning, LearningResourceRepository resources) {
        this.currentUser = currentUser;
        this.dashboard = dashboard;
        this.assignments = assignments;
        this.sessions = sessions;
        this.learning = learning;
        this.resources = resources;
    }

    @GetMapping("/mentees")
    public ResponseEntity<?> mentees(@RequestHeader(value = "Authorization", required = false) String auth) {
        Optional<User> mentor = mentor(auth);
        if (mentor.isEmpty()) return unauthorized();
        return ResponseEntity.ok(Map.of("mentees", dashboard.menteeList(mentor.get())));
    }

    @GetMapping("/mentees/{email}")
    public ResponseEntity<?> mentee(@RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable String email) {
        Optional<User> mentor = mentor(auth);
        if (mentor.isEmpty()) return unauthorized();
        return run(() -> ResponseEntity.ok(dashboard.menteeDetail(mentor.get(), email)));
    }

    /** Body: { employeeEmail, resourceId? , learningTitle?, competency?, dueDate? (yyyy-MM-dd) } */
    @PostMapping("/assign-course")
    public ResponseEntity<?> assignCourse(@RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody Map<String, Object> body) {
        Optional<User> mentor = mentor(auth);
        if (mentor.isEmpty()) return unauthorized();
        String employeeEmail = str(body.get("employeeEmail"));
        if (!assignments.isMentee(mentor.get().getEmail(), employeeEmail)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "You can only assign courses to your own mentees."));
        }
        return run(() -> {
            String title = str(body.get("learningTitle"));
            String competency = str(body.get("competency"));
            Long resourceId = body.get("resourceId") instanceof Number n ? n.longValue() : null;
            if (resourceId != null) {
                LearningResource resource = resources.findById(resourceId)
                        .filter(LearningResource::isActive)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "That resource is not available."));
                if (title.isBlank()) title = resource.getTitle();
                if (competency.isBlank()) competency = resource.getCompetency() != null ? resource.getCompetency() : resource.getCategory();
            }
            LocalDate due = null;
            if (!str(body.get("dueDate")).isBlank()) {
                try { due = LocalDate.parse(str(body.get("dueDate"))); }
                catch (RuntimeException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Due date must be yyyy-MM-dd."); }
            }
            LearningEnrollment saved = learning.assign(mentor.get(), new LearningProgressService.AssignCommand(
                    employeeEmail, title, mentor.get().getEmail(), competency, resourceId, due, "MENTOR_ASSIGNED"));
            return ResponseEntity.status(HttpStatus.CREATED).body(learning.toView(saved));
        });
    }

    // ------------------------------------------------------------------ sessions

    @GetMapping("/sessions")
    public ResponseEntity<?> sessions(@RequestHeader(value = "Authorization", required = false) String auth) {
        Optional<User> mentor = mentor(auth);
        if (mentor.isEmpty()) return unauthorized();
        Map<String, User> byEmail = sessions.usersByEmail();
        List<Map<String, Object>> rows = sessions.forMentor(mentor.get().getEmail()).stream()
                .map(s -> sessions.view(s, byEmail)).toList();
        return ResponseEntity.ok(Map.of("sessions", rows));
    }

    /** Body: { employeeEmail, title, subject?, agenda?, scheduledAt (ISO instant), durationMinutes?, meetLink? } */
    @PostMapping("/sessions")
    public ResponseEntity<?> schedule(@RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody Map<String, Object> body) {
        Optional<User> mentor = mentor(auth);
        if (mentor.isEmpty()) return unauthorized();
        return run(() -> {
            Instant when;
            try { when = Instant.parse(str(body.get("scheduledAt"))); }
            catch (RuntimeException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid date and time."); }
            MentoringSession saved = sessions.schedule(mentor.get(), new MentoringSessionService.NewSession(
                    str(body.get("employeeEmail")), str(body.get("title")), str(body.get("subject")),
                    str(body.get("agenda")), when,
                    body.get("durationMinutes") instanceof Number n ? n.intValue() : null,
                    str(body.get("meetLink"))));
            return ResponseEntity.status(HttpStatus.CREATED).body(sessions.view(saved, sessions.usersByEmail()));
        });
    }

    @PatchMapping("/sessions/{id}")
    public ResponseEntity<?> update(@RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        Optional<User> mentor = mentor(auth);
        if (mentor.isEmpty()) return unauthorized();
        return run(() -> ResponseEntity.ok(sessions.view(sessions.update(mentor.get(), id, body), sessions.usersByEmail())));
    }

    // ------------------------------------------------------------------ helpers

    private interface Action { ResponseEntity<?> run(); }

    private ResponseEntity<?> run(Action action) {
        try {
            return action.run();
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", String.valueOf(e.getReason())));
        }
    }

    private String str(Object o) {
        return o == null ? "" : String.valueOf(o).trim();
    }

    private Optional<User> mentor(String auth) {
        return currentUser.from(auth).filter(u -> "ROLE_MENTOR".equals(u.getRole()));
    }

    private ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "A valid mentor session is required."));
    }
}
