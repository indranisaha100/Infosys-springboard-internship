package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.model.Connection;
import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.ConnectionRepository;
import com.knowledgegap.backend.repository.UserRepository;
import com.knowledgegap.backend.security.JwtTokenProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
//import com.knowledgegap.backend.service.NotificationService;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/connections")
public class ConnectionController {
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final ConnectionRepository connectionRepository;
  //  private final NotificationService notifications;

    public ConnectionController(UserRepository userRepository, JwtTokenProvider jwtTokenProvider,
            ConnectionRepository connectionRepository) {
        this.userRepository = userRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.connectionRepository = connectionRepository;
        //this.notifications=notifications;
    }

    // All other employees with my connection status: NONE, SENT, RECEIVED, CONNECTED
    @GetMapping
    public ResponseEntity<?> people(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Optional<User> me = authenticatedEmployee(authorization);
        if (me.isEmpty()) return unauthorized();
        String myEmail = me.get().getEmail();

        Map<String, Connection> byPeer = new HashMap<>();
        for (Connection c : connectionRepository.findAllFor(myEmail)) {
            String peer = c.getRequesterEmail().equalsIgnoreCase(myEmail)
                    ? c.getReceiverEmail() : c.getRequesterEmail();
            byPeer.put(peer.toLowerCase(), c);
        }

        List<Map<String, Object>> people = userRepository.findByRole("ROLE_EMPLOYEE").stream()
                .filter(u -> !u.getEmail().equalsIgnoreCase(myEmail))
                .map(u -> {
                    Connection c = byPeer.get(u.getEmail().toLowerCase());
                    String status = "NONE";
                    if (c != null) {
                        if ("ACCEPTED".equals(c.getStatus())) status = "CONNECTED";
                        else status = c.getRequesterEmail().equalsIgnoreCase(myEmail) ? "SENT" : "RECEIVED";
                    }
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("name", displayName(u));
                    item.put("email", u.getEmail());
                    item.put("status", status);
                    item.put("connectionId", c == null ? null : c.getId());
                    return item;
                })
                .toList();
        return ResponseEntity.ok(people);
    }

    @PostMapping("/request")
    public ResponseEntity<?> sendRequest(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody Map<String, String> body) {
        Optional<User> me = authenticatedEmployee(authorization);
        if (me.isEmpty()) return unauthorized();
        Optional<User> target = userRepository.findByEmail(body.getOrDefault("to", ""));
        if (target.isEmpty() || !"ROLE_EMPLOYEE".equals(target.get().getRole())
                || target.get().getEmail().equalsIgnoreCase(me.get().getEmail())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Choose another employee."));
        }
        if (connectionRepository.findBetween(me.get().getEmail(), target.get().getEmail()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "A request already exists with this employee."));
        }
        Connection connection = new Connection();
        connection.setRequesterEmail(me.get().getEmail());
        connection.setReceiverEmail(target.get().getEmail());
        connection.setStatus("PENDING");
        connection.setCreatedAt(Instant.now());
        connectionRepository.save(connection);
        //notifications.notifyUser(target.get().getEmail(), "CONNECTION_REQUEST",
        //"New connection request", displayName(me.get()) + " wants to connect with you.");
        return ResponseEntity.ok(Map.of("message", "Request sent."));
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<?> accept(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Long id) {
        Optional<User> me = authenticatedEmployee(authorization);
        if (me.isEmpty()) return unauthorized();
        Optional<Connection> connection = connectionRepository.findById(id);
        if (connection.isEmpty() || !"PENDING".equals(connection.get().getStatus())
                || !connection.get().getReceiverEmail().equalsIgnoreCase(me.get().getEmail())) {
            return notFound();
        }
        connection.get().setStatus("ACCEPTED");
        connectionRepository.save(connection.get());
        //notifications.notifyUser(connection.get().getRequesterEmail(), "CONNECTION_ACCEPTED",
        //"Connection accepted", displayName(me.get()) + " accepted your request. You can chat now.");
        return ResponseEntity.ok(Map.of("message", "Request accepted."));
    }

    // Receiver declines, or sender cancels, a pending request.
    @PostMapping("/{id}/decline")
    public ResponseEntity<?> decline(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Long id) {
        Optional<User> me = authenticatedEmployee(authorization);
        if (me.isEmpty()) return unauthorized();
        Optional<Connection> connection = connectionRepository.findById(id);
        String myEmail = me.get().getEmail();
        if (connection.isEmpty() || !"PENDING".equals(connection.get().getStatus())
                || !(connection.get().getReceiverEmail().equalsIgnoreCase(myEmail)
                        || connection.get().getRequesterEmail().equalsIgnoreCase(myEmail))) {
            return notFound();
        }
        connectionRepository.delete(connection.get());
        return ResponseEntity.ok(Map.of("message", "Request removed."));
    }

    private Optional<User> authenticatedEmployee(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) return Optional.empty();
        String token = authorization.substring(7);
        if (!jwtTokenProvider.validateToken(token)) return Optional.empty();
        return userRepository.findByEmail(jwtTokenProvider.getEmailFromJWT(token))
                .filter(u -> "ROLE_EMPLOYEE".equals(u.getRole()));
    }

    private String displayName(User user) {
        String first = user.getFirstName() == null ? "" : user.getFirstName();
        String last = user.getLastName() == null ? "" : user.getLastName();
        String name = (first + " " + last).trim();
        return name.isBlank() ? user.getEmail() : name;
    }

    private ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "A valid employee session is required."));
    }

    private ResponseEntity<Map<String, String>> notFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Request not found."));
    }
}
