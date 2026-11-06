package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.model.MentorshipRequest;
import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.MentorshipRequestRepository;
import com.knowledgegap.backend.repository.UserRepository;
import com.knowledgegap.backend.security.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
//import com.knowledgegap.backend.service.NotificationService;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/mentorship")
public class MentorshipController {
    private final CurrentUser currentUser;
    private final UserRepository users;
    private final MentorshipRequestRepository requests;
  //  private final NotificationService notifications;

    public MentorshipController(CurrentUser currentUser, UserRepository users,
            MentorshipRequestRepository requests) {
        this.currentUser = currentUser;
        this.users = users;
        this.requests = requests;
        //this.notifications = notifications;
    }

    @GetMapping("/mentors")
    public ResponseEntity<?> mentors(
            @RequestHeader(value = "Authorization", required = false) String auth) {
        Optional<User> me = currentUser.from(auth).filter(u -> "ROLE_EMPLOYEE".equals(u.getRole()));
        if (me.isEmpty()) return unauthorized();
        List<Map<String, Object>> list = users.findByRole("ROLE_MENTOR").stream().map(m -> {
            List<MentorshipRequest> mine =
                    requests.findByEmployeeEmailAndMentorEmail(me.get().getEmail(), m.getEmail());
            String status = "NONE";
            if (mine.stream().anyMatch(r -> "ACCEPTED".equals(r.getStatus()))) status = "ACCEPTED";
            else if (mine.stream().anyMatch(r -> "PENDING".equals(r.getStatus()))) status = "PENDING";
            return Map.<String, Object>of("name", currentUser.displayName(m), "email", m.getEmail(),
                    "status", status);
        }).toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping("/requests")
    public ResponseEntity<?> request(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody Map<String, String> body) {
        Optional<User> me = currentUser.from(auth).filter(u -> "ROLE_EMPLOYEE".equals(u.getRole()));
        if (me.isEmpty()) return unauthorized();
        Optional<User> mentor = users.findByEmail(body.getOrDefault("mentorEmail", ""))
                .filter(u -> "ROLE_MENTOR".equals(u.getRole()));
        String goal = body.getOrDefault("skillGoal", "").trim();
        if (mentor.isEmpty() || goal.isEmpty() || goal.length() > 500) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Choose a mentor and enter a skill goal (up to 500 characters)."));
        }
        boolean open = requests.findByEmployeeEmailAndMentorEmail(me.get().getEmail(), mentor.get().getEmail())
                .stream().anyMatch(r -> "PENDING".equals(r.getStatus()) || "ACCEPTED".equals(r.getStatus()));
        if (open) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "You already have an active request with this mentor."));
        }
        MentorshipRequest request = new MentorshipRequest();
        request.setEmployeeEmail(me.get().getEmail());
        request.setMentorEmail(mentor.get().getEmail());
        request.setSkillGoal(goal);
        request.setStatus("PENDING");
        request.setCreatedAt(Instant.now());
        requests.save(request);
         //notifications.notifyUser(mentor.get().getEmail(), "MENTORSHIP_REQUEST",
        //"New mentorship request from " + currentUser.displayName(me.get()), "Goal: " + goal);
        return ResponseEntity.ok(Map.of("message", "Request sent."));
    }

    @GetMapping("/requests/incoming")
    public ResponseEntity<?> incoming(
            @RequestHeader(value = "Authorization", required = false) String auth) {
        Optional<User> me = currentUser.from(auth).filter(u -> "ROLE_MENTOR".equals(u.getRole()));
        if (me.isEmpty()) return unauthorized();
        List<Map<String, Object>> list = requests.findByMentorEmailAndStatus(me.get().getEmail(), "PENDING")
                .stream().map(r -> {
                    String name = users.findByEmail(r.getEmployeeEmail())
                            .map(currentUser::displayName).orElse(r.getEmployeeEmail());
                    return Map.<String, Object>of("id", r.getId(), "name", name,
                            "skillGoal", r.getSkillGoal(), "createdAt", r.getCreatedAt().toString());
                }).toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping("/requests/{id}/accept")
    public ResponseEntity<?> accept(
            @RequestHeader(value = "Authorization", required = false) String auth, @PathVariable Long id) {
        return decide(auth, id, "ACCEPTED");
    }

    @PostMapping("/requests/{id}/decline")
    public ResponseEntity<?> decline(
            @RequestHeader(value = "Authorization", required = false) String auth, @PathVariable Long id) {
        return decide(auth, id, "DECLINED");
    }

    private ResponseEntity<?> decide(String auth, Long id, String status) {
        Optional<User> me = currentUser.from(auth).filter(u -> "ROLE_MENTOR".equals(u.getRole()));
        if (me.isEmpty()) return unauthorized();
        Optional<MentorshipRequest> request = requests.findById(id);
        if (request.isEmpty() || !"PENDING".equals(request.get().getStatus())
                || !request.get().getMentorEmail().equalsIgnoreCase(me.get().getEmail())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Request not found."));
        }
        request.get().setStatus(status);
        requests.save(request.get());
         //boolean accepted = "ACCEPTED".equals(status);
//notifications.notifyUser(request.get().getEmployeeEmail(),
  //      accepted ? "MENTORSHIP_ACCEPTED" : "MENTORSHIP_DECLINED",
    //    accepted ? "Mentorship request accepted" : "Mentorship request declined",
      //  currentUser.displayName(me.get()) + (accepted ? " accepted your request. You can chat now." : " declined your request."));
        return ResponseEntity.ok(Map.of("message", "Request " + status.toLowerCase() + "."));
    }

    private ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "A valid session with the right role is required."));
    }
}
