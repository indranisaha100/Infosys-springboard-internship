
package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.UserRepository;
import com.knowledgegap.backend.security.JwtTokenProvider;
import com.knowledgegap.backend.service.ManagerDashboardService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

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
                || "ROLE_DEPARTMENT_HEAD".equals(manager.getRole())
                || "ROLE_HR".equals(manager.getRole())
                || "ROLE_ADMIN".equals(manager.getRole()))) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Manager access required."));
        }

        Map<String, Object> dashboard =
                managerDashboardService.getDashboardData(manager);

        return ResponseEntity.ok(dashboard);
    }

    // HR / Admin: assign an employee to a manager's team
    @PutMapping("/assign")
    public ResponseEntity<?> assignEmployee(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody Map<String, String> body) {

        if (authorization == null || !authorization.startsWith("Bearer ")
                || !jwtTokenProvider.validateToken(authorization.substring(7))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please log in first."));
        }
        User caller = userRepository
                .findByEmail(jwtTokenProvider.getEmailFromJWT(authorization.substring(7))).orElse(null);
        if (caller == null
                || !("ROLE_HR".equals(caller.getRole()) || "ROLE_ADMIN".equals(caller.getRole()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "HR access required."));
        }
        Optional<User> employee = userRepository.findByEmail(
                body.getOrDefault("employeeEmail", "").trim().toLowerCase());
        Optional<User> mgr = userRepository.findByEmail(
                body.getOrDefault("managerEmail", "").trim().toLowerCase());
        if (employee.isEmpty() || !"ROLE_EMPLOYEE".equals(employee.get().getRole())
                || mgr.isEmpty() || !"ROLE_MANAGER".equals(mgr.get().getRole())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Provide a valid employeeEmail and managerEmail."));
        }
        employee.get().setManagerEmail(mgr.get().getEmail());
        userRepository.save(employee.get());
        return ResponseEntity.ok(Map.of("message", "Employee assigned to manager."));
    }
}