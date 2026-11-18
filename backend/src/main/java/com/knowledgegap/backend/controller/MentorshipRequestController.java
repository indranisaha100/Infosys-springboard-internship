package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.model.MentorshipRequest;
import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.MentorshipRequestRepository;
import com.knowledgegap.backend.repository.UserRepository;
import com.knowledgegap.backend.security.JwtTokenProvider;
import com.knowledgegap.backend.service.ChatPushService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/mentorship/requests")
public class MentorshipRequestController {
    private final MentorshipRequestRepository requests;
    private final UserRepository users;
    private final JwtTokenProvider tokens;
    private final ChatPushService push;

    public MentorshipRequestController(MentorshipRequestRepository requests, UserRepository users,
            JwtTokenProvider tokens, ChatPushService push) {
        this.requests = requests;
        this.users = users;
        this.tokens = tokens;
        this.push = push;
    }

    @GetMapping
    public ResponseEntity<?> mine(@RequestHeader(value = "Authorization", required = false) String auth) {
        Optional<User> user = authenticated(auth);
        if (user.isEmpty() || (!"ROLE_EMPLOYEE".equals(user.get().getRole())
                && !"ROLE_MENTOR".equals(user.get().getRole()))) return unauthorized();
        return ResponseEntity.ok(requests.findByEmployeeEmailOrMentorEmailOrderByCreatedAtDesc(
                user.get().getEmail(), user.get().getEmail()));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody MentorshipRequest input) {
        Optional<User> employee = authenticated(auth);
        if (employee.isEmpty() || !"ROLE_EMPLOYEE".equals(employee.get().getRole())) return unauthorized();
        if (input == null || input.getMentorEmail() == null || input.getMentorEmail().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "A mentor email is required."));
        }
        if (users.findByEmail(input.getMentorEmail()).filter(user -> "ROLE_MENTOR".equals(user.getRole())).isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "The selected mentor is not available."));
        }
        input.setId(null);
        input.setEmployeeEmail(employee.get().getEmail());
        input.setStatus("PENDING");
        input.setCreatedAt(Instant.now());
        MentorshipRequest created = requests.save(input);
        push.refresh(created.getMentorEmail());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> update(@RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        Optional<User> mentor = authenticated(auth);
        if (mentor.isEmpty() || !"ROLE_MENTOR".equals(mentor.get().getRole())) return unauthorized();
        return requests.findById(id).filter(request -> mentor.get().getEmail().equals(request.getMentorEmail()))
                .map(request -> {
                    String status = body.get("status");
                    if (!"ACCEPTED".equals(status) && !"DECLINED".equals(status)) {
                        return ResponseEntity.badRequest().body(Map.of("message", "Status must be ACCEPTED or DECLINED."));
                    }
                    request.setStatus(status);
                    MentorshipRequest updated = requests.save(request);
                    push.refresh(updated.getEmployeeEmail());
                    return ResponseEntity.ok(updated);
                }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    private Optional<User> authenticated(String auth) {
        if (auth == null || !auth.startsWith("Bearer ")) return Optional.empty();
        String token = auth.substring(7);
        if (!tokens.validateToken(token)) return Optional.empty();
        try {
            return users.findByEmail(tokens.getEmailFromJWT(token));
        } catch (RuntimeException exception) {
            return Optional.empty();
        }
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "A valid employee or mentor session is required."));
    }
}
