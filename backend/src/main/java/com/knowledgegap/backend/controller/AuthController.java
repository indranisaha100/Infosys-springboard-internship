package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.UserRepository;
import com.knowledgegap.backend.security.JwtTokenProvider;
import org.springframework.http.HttpHeaders;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.security.hr-setup-key:}")
    private String hrSetupKey;

    public AuthController(UserRepository userRepository, JwtTokenProvider jwtTokenProvider,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, String> input) {
        String email = clean(input.get("email")).toLowerCase(Locale.ROOT);
        String password = input.get("password");
        String requestedRole = normalizeRole(input.get("requestedRole"));
        if (email.isBlank() || password == null || password.length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("message", "Name, official email, and a password of at least 8 characters are required."));
        }
        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "An account with this email already exists."));
        }
        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setFirstName(clean(input.get("firstName")));
        user.setLastName(clean(input.get("lastName")));
        user.setRequestedRole(requestedRole);
        user.setDepartment(clean(input.get("department")));
        user.setRole("ROLE_PENDING");
        user.setStatus("PENDING");
        User saved = userRepository.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "email", saved.getEmail(), "status", saved.getStatus(),
                "message", "Registration received. Your request is pending HR approval."));
    }

    /** One-time bootstrap. Configure HR_SETUP_KEY with a long random secret before use. */
    @PostMapping("/setup-hr")
    public ResponseEntity<?> setupInitialHr(@RequestHeader(value = "X-HR-Setup-Key", required = false) String setupKey,
            @RequestBody Map<String, String> input) {
        if (hrSetupKey == null || hrSetupKey.isBlank() || !hrSetupKey.equals(setupKey)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "HR setup is not available."));
        }
        boolean hrExists = userRepository.findAll().stream().anyMatch(user ->
                "ROLE_HR".equals(user.getRole()) || "ROLE_ADMIN".equals(user.getRole()));
        if (hrExists) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Initial HR setup has already been completed."));
        }
        String email = clean(input.get("email")).toLowerCase(Locale.ROOT);
        String password = input.get("password");
        if (email.isBlank() || password == null || password.length() < 12 || userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Provide a unique email and a password of at least 12 characters."));
        }
        User hr = new User();
        hr.setEmail(email);
        hr.setPassword(passwordEncoder.encode(password));
        hr.setFirstName(clean(input.get("firstName")));
        hr.setLastName(clean(input.get("lastName")));
        hr.setDepartment(clean(input.get("department")));
        hr.setRole("ROLE_HR");
        hr.setRequestedRole("ROLE_HR");
        hr.setStatus("APPROVED");
        User saved = userRepository.save(hr);
        saved.setUserId(makeUserId(saved));
        saved = userRepository.save(saved);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "email", saved.getEmail(), "userId", saved.getUserId(), "role", saved.getRole(),
                "message", "Initial HR account created. Sign in with the password provided during setup."));
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody Map<String, String> loginRequest) {
        String identifier = clean(loginRequest.getOrDefault("identifier", loginRequest.get("email")));
        Optional<User> userOptional = userRepository.findByEmail(identifier.toLowerCase(Locale.ROOT));
        if (userOptional.isEmpty()) userOptional = userRepository.findByUserIdIgnoreCase(identifier);
        if (userOptional.isEmpty() || loginRequest.get("password") == null
                || !passwordEncoder.matches(loginRequest.get("password"), userOptional.get().getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid email/user ID or password."));
        }
        User user = userOptional.get();
        if (!"APPROVED".equalsIgnoreCase(user.getStatus())) {
            String message = "PENDING".equalsIgnoreCase(user.getStatus()) || "NEEDS_DETAILS".equalsIgnoreCase(user.getStatus())
                    ? "Your registration is pending HR approval. You cannot access the dashboard yet."
                    : "This account is not active. Contact HR for assistance.";
            if ("NEEDS_DETAILS".equalsIgnoreCase(user.getStatus()) && user.getReviewNote() != null && !user.getReviewNote().isBlank()) {
                message += " HR requested: " + user.getReviewNote();
            }
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("status", user.getStatus(), "message", message));
        }
        Map<String, Object> response = new HashMap<>();
        response.put("token", jwtTokenProvider.generateToken(user.getEmail()));
        response.put("type", "Bearer");
        response.put("email", user.getEmail());
        response.put("userId", user.getUserId());
        response.put("firstName", user.getFirstName());
        response.put("lastName", user.getLastName());
        response.put("role", user.getRole());
        response.put("department", user.getDepartment());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/registration-requests")
    public ResponseEntity<?> registrationRequests(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        if (!isHr(authorization)) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "A valid HR session is required."));
        return ResponseEntity.ok(userRepository.findAll().stream()
                .filter(user -> "PENDING".equals(user.getStatus()) || "NEEDS_DETAILS".equals(user.getStatus()))
                .map(this::publicUser).toList());
    }

    @PostMapping("/registration-requests/{id}/review")
    public ResponseEntity<?> reviewRegistration(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @PathVariable Long id, @RequestBody Map<String, String> input) {
        if (!isHr(authorization)) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "A valid HR session is required."));
        Optional<User> optional = userRepository.findById(id);
        if (optional.isEmpty() || !("PENDING".equals(optional.get().getStatus()) || "NEEDS_DETAILS".equals(optional.get().getStatus()))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Pending registration was not found."));
        }
        User user = optional.get();
        String action = clean(input.get("action")).toUpperCase(Locale.ROOT);
        String note = clean(input.get("note"));
        if ("REQUEST_DETAILS".equals(action) && note.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Add a note describing the details HR needs."));
        }
        user.setReviewNote(note);
        switch (action) {
            case "APPROVE" -> {
                user.setRole(normalizeRole(user.getRequestedRole()));
                user.setStatus("APPROVED");
                user.setUserId(makeUserId(user));
            }
            case "REJECT" -> user.setStatus("REJECTED");
            case "REQUEST_DETAILS" -> user.setStatus("NEEDS_DETAILS");
            default -> { return ResponseEntity.badRequest().body(Map.of("message", "Action must be APPROVE, REJECT, or REQUEST_DETAILS.")); }
        }
        return ResponseEntity.ok(publicUser(userRepository.save(user)));
    }

    @PostMapping("/registration-request/details")
    public ResponseEntity<?> submitRequestedDetails(@RequestBody Map<String, String> input) {
        String email = clean(input.get("email")).toLowerCase(Locale.ROOT);
        String password = input.get("password");
        String details = clean(input.get("details"));
        Optional<User> optional = userRepository.findByEmail(email);
        if (optional.isEmpty() || password == null || !passwordEncoder.matches(password, optional.get().getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid email or password."));
        }
        User user = optional.get();
        if (!"NEEDS_DETAILS".equals(user.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "HR has not requested more details for this account."));
        }
        if (details.isBlank()) return ResponseEntity.badRequest().body(Map.of("message", "Enter the details HR requested."));
        user.setReviewNote("Applicant response: " + details);
        user.setStatus("PENDING");
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Your details were submitted. Your registration is pending HR review again."));
    }

    private Map<String, Object> publicUser(User user) {
        Map<String, Object> result = new HashMap<>();
        result.put("id", user.getId()); result.put("name", (clean(user.getFirstName()) + " " + clean(user.getLastName())).trim());
        result.put("email", user.getEmail()); result.put("requestedRole", user.getRequestedRole());
        result.put("department", user.getDepartment()); result.put("status", user.getStatus());
        result.put("userId", user.getUserId()); result.put("role", user.getRole());
        result.put("reviewNote", user.getReviewNote());
        return result;
    }

    private boolean isHr(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) return false;
        String token = authorization.substring(7);
        if (!jwtTokenProvider.validateToken(token)) return false;
        try {
            return userRepository.findByEmail(jwtTokenProvider.getEmailFromJWT(token))
                    .map(user -> "APPROVED".equals(user.getStatus()) && ("ROLE_HR".equals(user.getRole()) || "ROLE_ADMIN".equals(user.getRole())))
                    .orElse(false);
        } catch (RuntimeException exception) { return false; }
    }

    private String normalizeRole(String role) {
        String value = clean(role).toUpperCase(Locale.ROOT).replace(" ", "_");
        if (!value.startsWith("ROLE_")) value = "ROLE_" + value;
        return switch (value) {
            case "ROLE_EMPLOYEE", "ROLE_MENTOR", "ROLE_MANAGER", "ROLE_HR", "ROLE_DEPARTMENT_HEAD" -> value;
            default -> "ROLE_EMPLOYEE";
        };
    }

    private String makeUserId(User user) {
        String prefix = switch (user.getRole()) {
            case "ROLE_HR" -> "HR";
            case "ROLE_MANAGER" -> "MGR";
            case "ROLE_MENTOR" -> "MEN";
            case "ROLE_DEPARTMENT_HEAD" -> "DH";
            default -> "EMP";
        };
        return prefix + String.format("%06d", user.getId());
    }

    private String clean(String value) { return value == null ? "" : value.trim(); }
}
