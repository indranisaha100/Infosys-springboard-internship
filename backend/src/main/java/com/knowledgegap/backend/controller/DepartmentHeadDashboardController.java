package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.UserRepository;
import com.knowledgegap.backend.security.JwtTokenProvider;
import com.knowledgegap.backend.service.DepartmentHeadDashboardService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/department-head")
public class DepartmentHeadDashboardController {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final DepartmentHeadDashboardService dashboardService;

    public DepartmentHeadDashboardController(
            UserRepository userRepository,
            JwtTokenProvider jwtTokenProvider,
            DepartmentHeadDashboardService dashboardService) {

        this.userRepository = userRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.dashboardService = dashboardService;
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
                    .body(Map.of("message", "Invalid or expired session. Please log in again."));
        }

        String email = jwtTokenProvider.getEmailFromJWT(token);

        User departmentHead =
                userRepository.findByEmail(email).orElse(null);

        if (departmentHead == null
                || !"ROLE_DEPARTMENT_HEAD".equals(departmentHead.getRole())
                || (departmentHead.getStatus() != null
                    && !"APPROVED".equalsIgnoreCase(departmentHead.getStatus()))) {

            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Department Head access is required."));
        }

        if (departmentHead.getDepartment() == null
                || departmentHead.getDepartment().isBlank()) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                        "message",
                        "Your account does not have a department assigned. Ask HR to update your department."
                    ));
        }

        return ResponseEntity.ok(
                dashboardService.getDashboardData(departmentHead)
        );
    }
}