
package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.UserRepository;
import com.knowledgegap.backend.security.JwtTokenProvider;
import com.knowledgegap.backend.service.ManagerDashboardService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/manager")
public class ManagerDashboardController {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final ManagerDashboardService managerDashboardService;

    public ManagerDashboardController(
            UserRepository userRepository,
            JwtTokenProvider jwtTokenProvider,
            ManagerDashboardService managerDashboardService) {

        this.userRepository = userRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.managerDashboardService = managerDashboardService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard(
            @RequestHeader(value = "Authorization", required = false)
            String authorization) {

        if (authorization == null ||
                !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please log in first."));
        }

        String token = authorization.substring(7);

        if (!jwtTokenProvider.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid or expired token."));
        }

        String email = jwtTokenProvider.getEmailFromJWT(token);

        User manager = userRepository.findByEmail(email).orElse(null);

        if (manager == null ||
                !("ROLE_MANAGER".equals(manager.getRole())
                || "ROLE_HR".equals(manager.getRole())
                || "ROLE_ADMIN".equals(manager.getRole()))) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Manager access required."));
        }

        Map<String, Object> dashboard =
                managerDashboardService.getDashboardData(manager);

        return ResponseEntity.ok(dashboard);
    }
}
