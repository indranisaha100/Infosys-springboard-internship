package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.repository.UserRepository;
import com.knowledgegap.backend.security.JwtTokenProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/mentor")
public class MentorController {
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;

    public MentorController(UserRepository userRepository, JwtTokenProvider jwtTokenProvider) {
        this.userRepository = userRepository;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Optional<com.knowledgegap.backend.model.User> mentor = authenticatedMentor(authorization);
        if (mentor.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "A valid mentor session is required."));
        }

        return ResponseEntity.ok(Map.of(
                "stats", List.of(
                        stat("Total Mentees", 24, "Across 5 departments", "users", "blue"),
                        stat("Pending Assessments", 8, "3 due this week", "check", "amber"),
                        stat("Knowledge Gaps Identified", 12, "4 high priority", "gap", "purple"),
                        stat("Active Learning Plans", 15, "82% on track", "book", "green")),
                "mentees", List.of(
                        mentee("Aarav Sharma", "AS", "Engineering", "Java", "Spring Boot", 82, "On Track"),
                        mentee("Priya Menon", "PM", "Data & Analytics", "SQL", "Query Optimization", 58, "Needs Attention"),
                        mentee("Rohan Das", "RD", "Product", "React", "State Management", 74, "On Track"),
                        mentee("Maya Iyer", "MI", "Customer Success", "Communication", "Presentation Skills", 100, "Completed")),
                "gaps", List.of(
                        gap("Java Programming", 72, "bg-blue-500"),
                        gap("SQL and Database Management", 58, "bg-violet-500"),
                        gap("React Development", 46, "bg-cyan-500"),
                        gap("Cloud Computing", 38, "bg-amber-500"),
                        gap("Communication Skills", 29, "bg-emerald-500")),
                "recommendations", List.of(
                        resource("Building Production APIs with Spring Boot", "Java", "Intermediate", "6 hours", "code"),
                        resource("SQL Performance Tuning Essentials", "SQL", "Advanced", "4 hours", "database"),
                        resource("Modern React State Patterns", "React", "Intermediate", "3.5 hours", "layers")),
                "sessions", List.of(
                        session("Aarav Sharma", "Spring Boot architecture review", "Oct 28, 2026", "10:00 AM"),
                        session("Rohan Das", "React project check-in", "Oct 29, 2026", "2:30 PM"),
                        session("Priya Menon", "SQL learning plan", "Oct 31, 2026", "11:00 AM")),
                "activity", List.of(
                        activity("Maya Iyer completed a skill assessment.", "18 minutes ago", "check"),
                        activity("A new React knowledge gap was detected for Rohan Das.", "2 hours ago", "gap"),
                        activity("You assigned SQL Performance Tuning Essentials to Priya Menon.", "Yesterday", "book"),
                        activity("Aarav Sharma improved his Java score by 12%.", "Yesterday", "chart"))));
    }

    private Optional<com.knowledgegap.backend.model.User> authenticatedMentor(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) return Optional.empty();
        String token = authorization.substring(7);
        if (!jwtTokenProvider.validateToken(token)) return Optional.empty();
        return userRepository.findByEmail(jwtTokenProvider.getEmailFromJWT(token))
                .filter(user -> "ROLE_MENTOR".equals(user.getRole()));
    }

    private Map<String, Object> stat(String label, int value, String note, String icon, String tone) {
        return Map.of("label", label, "value", value, "note", note, "icon", icon, "tone", tone);
    }

    private Map<String, Object> mentee(String name, String initials, String department, String skill,
            String gap, int progress, String status) {
        return Map.of("name", name, "initials", initials, "department", department, "skill", skill,
                "gap", gap, "progress", progress, "status", status);
    }

    private Map<String, Object> gap(String name, int value, String color) {
        return Map.of("name", name, "value", value, "color", color);
    }

    private Map<String, Object> resource(String title, String category, String difficulty,
            String duration, String icon) {
        return Map.of("title", title, "category", category, "difficulty", difficulty,
                "duration", duration, "icon", icon);
    }

    private Map<String, Object> session(String name, String topic, String date, String time) {
        return Map.of("name", name, "topic", topic, "date", date, "time", time);
    }

    private Map<String, Object> activity(String text, String time, String icon) {
        return Map.of("text", text, "time", time, "icon", icon);
    }
}
