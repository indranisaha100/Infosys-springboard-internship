package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.UserRepository;
import com.knowledgegap.backend.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${app.security.admin-registration-key:}")
    private String adminRegistrationKey;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(
            @RequestBody User user,
            @RequestHeader(value = "X-Admin-Registration-Key", required = false) String registrationKey) {
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Error: Email is already in use!");
        }
        if ("ROLE_ADMIN".equals(user.getRole()) && !isValidAdminKey(registrationKey)) {
            return ResponseEntity.status(403).body("Admin registration requires a valid provisioning key.");
        }
        user.setRole(normalizeRole(user.getRole()));
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        User savedUser = userRepository.save(user);
        Map<String, Object> response = new HashMap<>();
        response.put("email", savedUser.getEmail());
        response.put("firstName", savedUser.getFirstName());
        response.put("lastName", savedUser.getLastName());
        response.put("role", savedUser.getRole());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody User loginRequest) {
        Optional<User> userOptional = userRepository.findByEmail(loginRequest.getEmail());

        if (userOptional.isPresent()
                && passwordEncoder.matches(loginRequest.getPassword(), userOptional.get().getPassword())) {
            User user = userOptional.get();

            // Generate JWT Token using user email
            String token = jwtTokenProvider.generateToken(user.getEmail());

            // Return token along with user details
            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("type", "Bearer");
            response.put("email", user.getEmail());
            response.put("firstName", user.getFirstName());
            response.put("role", user.getRole());

            return ResponseEntity.ok(response);
        }

        return ResponseEntity.status(401).body("Invalid email or password");
    }

    private boolean isValidAdminKey(String registrationKey) {
        return adminRegistrationKey != null
                && !adminRegistrationKey.isBlank()
                && adminRegistrationKey.equals(registrationKey);
    }

    private String normalizeRole(String role) {
        if ("ROLE_ADMIN".equals(role)) {
            return "ROLE_ADMIN";
        }
        if ("ROLE_HR".equals(role) || "ROLE_EMPLOYEE".equals(role)) {
            return role;
        }
        return "ROLE_EMPLOYEE";
    }
}