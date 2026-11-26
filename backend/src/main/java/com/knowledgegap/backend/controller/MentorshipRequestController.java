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
        if (input.getMessage() != null && input.getMessage().length() > 2000) {
            return ResponseEntity.badRequest().body(Map.of("message", "The request message cannot exceed 2000 characters."));
        }
        Optional<User> mentor = users.findByEmailIgnoreCase(input.getMentorEmail().trim())
                .filter(user -> "ROLE_MENTOR".equals(user.getRole()))
                .filter(user -> user.getStatus() == null || "APPROVED".equalsIgnoreCase(user.getStatus()));
        if (mentor.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "The selected mentor is not available."));
        }

        String mentorEmail = mentor.get().getEmail();
        Instant now = Instant.now();
        Optional<MentorshipRequest> existing = requests
                .findFirstByEmployeeEmailIgnoreCaseAndMentorEmailIgnoreCaseOrderByCreatedAtDesc(
                        employee.get().getEmail(), mentorEmail);
        if (existing.isPresent()) {
            MentorshipRequest current = existing.get();
            if ("ACCEPTED".equalsIgnoreCase(current.getStatus())) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("message", "This mentor has already accepted your request."));
            }
            current.setMessage(cleanMessage(input.getMessage()));
            current.setStatus("PENDING");
            current.setCreatedAt(now);
            MentorshipRequest updated = requests.save(current);
            push.refresh(mentorEmail);
            return ResponseEntity.ok(updated);
        }

        MentorshipRequest created = new MentorshipRequest();
        created.setEmployeeEmail(employee.get().getEmail());
        created.setMentorEmail(mentorEmail);
        created.setMessage(cleanMessage(input.getMessage()));
        created.setStatus("PENDING");
        created.setCreatedAt(now);
        created = requests.save(created);
        push.refresh(mentorEmail);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> update(@RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        Optional<User> actor = authenticated(auth);
        if (actor.isEmpty()) return unauthorized();

        if ("ROLE_EMPLOYEE".equals(actor.get().getRole())) {
            Optional<MentorshipRequest> request = requests.findById(id)
                    .filter(item -> actor.get().getEmail().equalsIgnoreCase(item.getEmployeeEmail()));
            if (request.isEmpty()) return ResponseEntity.notFound().build();
            if (!"PENDING".equalsIgnoreCase(request.get().getStatus())) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("message", "Only pending requests can be edited."));
            }
            String message = body.get("message");
            if (message != null && message.length() > 2000) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "The request message cannot exceed 2000 characters."));
            }
            request.get().setMessage(cleanMessage(message));
            MentorshipRequest updated = requests.save(request.get());
            push.refresh(updated.getMentorEmail());
            return ResponseEntity.ok(updated);
        }

        if ("ROLE_MENTOR".equals(actor.get().getRole())) {
            Optional<MentorshipRequest> request = requests.findById(id)
                    .filter(item -> actor.get().getEmail().equalsIgnoreCase(item.getMentorEmail()));
            if (request.isEmpty()) return ResponseEntity.notFound().build();
            String status = body.get("status");
            if (!"ACCEPTED".equals(status) && !"DECLINED".equals(status)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Status must be ACCEPTED or DECLINED."));
            }
            request.get().setStatus(status);
            MentorshipRequest updated = requests.save(request.get());
            push.refresh(updated.getEmployeeEmail());
            return ResponseEntity.ok(updated);
        }

        return unauthorized();
    }

    private String cleanMessage(String message) {
        return message == null || message.isBlank() ? null : message.trim();
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
