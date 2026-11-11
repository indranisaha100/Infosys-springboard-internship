package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.model.AssessmentScore;
import com.knowledgegap.backend.model.GeneratedSkillProgram;
import com.knowledgegap.backend.model.HrNotification;
import com.knowledgegap.backend.model.LearningEnrollment;
import com.knowledgegap.backend.model.LearningResource;
import com.knowledgegap.backend.model.MentorshipRequest;
import com.knowledgegap.backend.model.RoleRequirement;
import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.AssessmentScoreRepository;
import com.knowledgegap.backend.repository.GeneratedSkillProgramRepository;
import com.knowledgegap.backend.repository.HrNotificationRepository;
import com.knowledgegap.backend.repository.LearningEnrollmentRepository;
import com.knowledgegap.backend.repository.LearningResourceRepository;
import com.knowledgegap.backend.repository.MentorshipRequestRepository;
import com.knowledgegap.backend.repository.RoleRequirementRepository;
import com.knowledgegap.backend.repository.UserRepository;
import com.knowledgegap.backend.security.JwtTokenProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/hr/skill-gap-analysis")
public class HrSkillGapAnalysisController {
    private static final String ACTIVE = "ACTIVE";
    private static final List<String> PALETTE = List.of(
            "#50C878", "#2ECC71", "#0F5257", "#114B5F", "#E8F8F5", "#A3E4D7");

    private final UserRepository users;
    private final AssessmentScoreRepository scores;
    private final RoleRequirementRepository roleRequirements;
    private final LearningEnrollmentRepository enrollments;
    private final LearningResourceRepository resources;
    private final GeneratedSkillProgramRepository programs;
    private final MentorshipRequestRepository mentorshipRequests;
    private final HrNotificationRepository notifications;
    private final JwtTokenProvider tokens;

    public HrSkillGapAnalysisController(
            UserRepository users,
            AssessmentScoreRepository scores,
            RoleRequirementRepository roleRequirements,
            LearningEnrollmentRepository enrollments,
            LearningResourceRepository resources,
            GeneratedSkillProgramRepository programs,
            MentorshipRequestRepository mentorshipRequests,
            HrNotificationRepository notifications,
            JwtTokenProvider tokens) {
        this.users = users;
        this.scores = scores;
        this.roleRequirements = roleRequirements;
        this.enrollments = enrollments;
        this.resources = resources;
        this.programs = programs;
        this.mentorshipRequests = mentorshipRequests;
        this.notifications = notifications;
        this.tokens = tokens;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> analysis(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Optional<User> hr = authenticatedHr(authorization);
        if (hr.isEmpty()) return unauthorized();
        return ResponseEntity.ok(analysisPayload(List.of()));
    }

    @PostMapping("/generate")
    @Transactional
    public ResponseEntity<?> generate(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        if (authenticatedHr(authorization).isEmpty()) return unauthorized();

        List<User> employees = activeUsers("ROLE_EMPLOYEE");
        List<User> mentors = activeUsers("ROLE_MENTOR");
        List<Gap> gaps = calculateGaps(employees);
        List<Map<String, Object>> generated = new ArrayList<>();
        List<Map<String, Object>> notificationPayloads = new ArrayList<>();

        for (Gap gap : gaps) {
            if (gap.gap() <= 0) continue;
            Optional<GeneratedSkillProgram> existing = programs
                    .findFirstByEmployeeIdAndCompetencyIgnoreCaseAndStatusOrderByCreatedAtDesc(
                            gap.employee().getId(), gap.competency(), ACTIVE);
            if (existing.isPresent()) {
                generated.add(programView(existing.get(), gap.employee(), mentorById(mentors, existing.get().getMentorId()), false));
                continue;
            }

            User mentor = bestMentor(mentors, gap.competency()).orElse(null);
            String learningTitle = learningTitle(gap.competency());
            GeneratedSkillProgram program = new GeneratedSkillProgram();
            program.setEmployeeId(gap.employee().getId());
            program.setEmployeeEmail(gap.employee().getEmail());
            program.setMentorId(mentor == null ? null : mentor.getId());
            program.setMentorEmail(mentor == null ? null : mentor.getEmail());
            program.setCompetency(gap.competency());
            program.setCurrentScore(gap.current());
            program.setTargetScore(gap.target());
            program.setGapPercent(gap.gap());
            program.setLearningTitle(learningTitle);
            program.setCreatedAt(Instant.now());
            program = programs.save(program);

            enrollEmployee(gap.employee(), mentor, learningTitle);
            if (mentor != null) {
                MentorshipRequest mentorship = new MentorshipRequest();
                mentorship.setEmployeeEmail(gap.employee().getEmail());
                mentorship.setMentorEmail(mentor.getEmail());
                mentorship.setMessage("HR matched you for " + gap.competency()
                        + " support. Suggested plan: " + learningTitle);
                mentorship.setStatus("PENDING");
                mentorship.setCreatedAt(Instant.now());
                mentorshipRequests.save(mentorship);
            }

            notificationPayloads.add(notification(
                    gap.employee(), "employee", "A skill development plan is ready",
                    learningTitle + " was added to your learning plan for " + gap.competency()
                            + " (" + gap.current() + "% current, " + gap.target() + "% target)."));
            if (mentor != null) {
                notificationPayloads.add(notification(
                        mentor, "mentor", "New mentorship assignment",
                        displayName(gap.employee()) + " was matched with you for " + gap.competency()
                                + ". Please review the pending mentorship request."));
            }
            generated.add(programView(program, gap.employee(), mentor, true));
        }

        return ResponseEntity.ok(analysisPayload(notificationPayloads, generated));
    }

    private Map<String, Object> analysisPayload(List<Map<String, Object>> notificationPayloads) {
        List<User> employees = activeUsers("ROLE_EMPLOYEE");
        List<User> mentors = activeUsers("ROLE_MENTOR");
        List<Gap> gaps = calculateGaps(employees);
        List<Map<String, Object>> generated = programs.findAllByOrderByCreatedAtDesc().stream()
                .limit(100)
                .map(program -> programView(program, findUser(employees, program.getEmployeeId()),
                        findUser(mentors, program.getMentorId()), false))
                .toList();
        return analysisPayload(notificationPayloads, generated, employees, mentors, gaps);
    }

    private Map<String, Object> analysisPayload(
            List<Map<String, Object>> notificationPayloads, List<Map<String, Object>> generated) {
        List<User> employees = activeUsers("ROLE_EMPLOYEE");
        List<User> mentors = activeUsers("ROLE_MENTOR");
        return analysisPayload(notificationPayloads, generated, employees, mentors, calculateGaps(employees));
    }

    private Map<String, Object> analysisPayload(
            List<Map<String, Object>> notificationPayloads,
            List<Map<String, Object>> generated,
            List<User> employees,
            List<User> mentors,
            List<Gap> gaps) {
        List<AssessmentScore> allScores = scores.findAllByOrderBySubmittedAtDesc();
        Map<String, Long> enrollmentStatuses = enrollments.findAllByOrderByUpdatedAtDesc().stream()
                .collect(Collectors.groupingBy(
                        enrollment -> normalizeStatus(enrollment.getStatus()),
                        LinkedHashMap::new,
                        Collectors.counting()));
        long enrollmentCount = enrollmentStatuses.values().stream().mapToLong(Long::longValue).sum();
        long completed = enrollmentStatuses.getOrDefault("COMPLETED", 0L);
        Map<String, AssessmentScore> latestScores = new LinkedHashMap<>();
        for (AssessmentScore score : allScores) {
            latestScores.putIfAbsent(score.getEmployeeEmail().toLowerCase(Locale.ROOT) + "|"
                    + score.getTopic().toLowerCase(Locale.ROOT), score);
        }
        Set<String> employeeEmails = employees.stream()
                .map(employee -> employee.getEmail().toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());
        List<AssessmentScore> activeLatestScores = latestScores.values().stream()
                .filter(score -> employeeEmails.contains(score.getEmployeeEmail().toLowerCase(Locale.ROOT)))
                .toList();
        long assessedEmployees = activeLatestScores.stream()
                .map(score -> score.getEmployeeEmail().toLowerCase(Locale.ROOT))
                .distinct()
                .count();
        double readiness = activeLatestScores.stream().mapToDouble(this::scorePercent).average().orElse(0);
        long openGaps = gaps.stream().filter(gap -> gap.gap() > 0).count();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("active_employees", employees.size());
        summary.put("active_mentors", mentors.size());
        summary.put("assigned_mentors", programs.findAllByOrderByCreatedAtDesc().stream()
                .filter(program -> ACTIVE.equalsIgnoreCase(program.getStatus()))
                .map(GeneratedSkillProgram::getMentorId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .count());
        summary.put("assessed_employees", assessedEmployees);
        summary.put("readiness_score", activeLatestScores.isEmpty() ? "N/A" : Math.round(readiness));
        summary.put("open_skill_gaps", openGaps);
        summary.put("program_completion_rate", enrollmentCount == 0 ? 0
                : Math.round(completed * 100.0 / enrollmentCount));
        summary.put("active_generated_programs", programs.findAllByOrderByCreatedAtDesc().stream()
                .filter(program -> ACTIVE.equalsIgnoreCase(program.getStatus())).count());

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("summary_kpis", summary);
        payload.put("generated_programs", generated);
        payload.put("notification_payloads", notificationPayloads);
        payload.put("chart_data", chartData(gaps, allScores, enrollmentStatuses, employees));
        return payload;
    }

    private Map<String, Object> chartData(
            List<Gap> gaps,
            List<AssessmentScore> allScores,
            Map<String, Long> enrollmentStatuses,
            List<User> employees) {
        Map<String, List<Gap>> byCompetency = gaps.stream().filter(gap -> gap.gap() > 0)
                .collect(Collectors.groupingBy(Gap::competency, LinkedHashMap::new, Collectors.toList()));
        List<Map<String, Object>> topGaps = byCompetency.entrySet().stream()
                .map(entry -> {
                    List<Gap> values = entry.getValue();
                    int averageGap = (int) Math.round(values.stream().mapToInt(Gap::gap).average().orElse(0));
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("label", entry.getKey());
                    result.put("value", averageGap);
                    result.put("employees_affected", values.size());
                    result.put("color", PALETTE.get(0));
                    return result;
                })
                .sorted(Comparator.comparingInt((Map<String, Object> row) -> (int) row.get("value")).reversed())
                .limit(8)
                .toList();

        Map<LocalDate, List<AssessmentScore>> scoresByDate = allScores.stream()
                .filter(score -> score.getSubmittedAt() != null)
                .collect(Collectors.groupingBy(score -> score.getSubmittedAt().atZone(ZoneOffset.UTC).toLocalDate(),
                        LinkedHashMap::new, Collectors.toList()));
        List<Map<String, Object>> trend = scoresByDate.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .skip(Math.max(0, scoresByDate.size() - 12L))
                .map(entry -> Map.<String, Object>of(
                        "date", entry.getKey().toString(),
                        "readiness_score", Math.round(entry.getValue().stream()
                                .mapToDouble(this::scorePercent).average().orElse(0))))
                .toList();

        List<Map<String, Object>> donut = enrollmentStatuses.entrySet().stream()
                .map(entry -> Map.<String, Object>of(
                        "label", entry.getKey(),
                        "value", entry.getValue(),
                        "color", PALETTE.get(Math.floorMod(entry.getKey().hashCode(), PALETTE.size()))))
                .toList();

        Map<Long, Map<String, Integer>> employeeScores = new LinkedHashMap<>();
        for (Gap gap : gaps) {
            employeeScores.computeIfAbsent(gap.employee().getId(), ignored -> new LinkedHashMap<>())
                    .put(gap.competency(), gap.current());
        }
        Set<String> competencies = gaps.stream().map(Gap::competency).distinct().limit(8)
                .collect(Collectors.toCollection(java.util.LinkedHashSet::new));
        List<Map<String, Object>> heatmap = employees.stream()
                .filter(employee -> employeeScores.containsKey(employee.getId()))
                .limit(20)
                .map(employee -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("employee_id", employee.getId());
                    row.put("employee", displayName(employee));
                    row.put("values", competencies.stream().collect(Collectors.toMap(
                            Function.identity(),
                            competency -> employeeScores.get(employee.getId()).getOrDefault(competency, 0),
                            (first, ignored) -> first,
                            LinkedHashMap::new)));
                    return row;
                })
                .toList();

        Map<String, Object> chartData = new LinkedHashMap<>();
        chartData.put("palette", Map.of(
                "primary", "#50C878",
                "secondary", "#2ECC71",
                "forest", "#0F5257",
                "deep_forest", "#114B5F",
                "mint_background", "#E8F8F5",
                "mint_highlight", "#A3E4D7"));
        chartData.put("top_gaps_bar", topGaps);
        chartData.put("enrollment_status_donut", donut);
        chartData.put("readiness_trend_line", trend);
        chartData.put("employee_skill_heatmap", Map.of(
                "competencies", competencies,
                "rows", heatmap,
                "low", "#E8F8F5",
                "high", "#2ECC71"));
        return chartData;
    }

    private List<Gap> calculateGaps(List<User> employees) {
        List<AssessmentScore> allScores = scores.findAllByOrderBySubmittedAtDesc();
        Map<String, AssessmentScore> latest = new LinkedHashMap<>();
        for (AssessmentScore score : allScores) {
            latest.putIfAbsent(score.getEmployeeEmail().toLowerCase(Locale.ROOT) + "|"
                    + score.getTopic().toLowerCase(Locale.ROOT), score);
        }

        Map<String, List<RoleRequirement>> requirementsByRole = roleRequirements.findAllByOrderByRoleNameAsc()
                .stream().collect(Collectors.groupingBy(
                        requirement -> requirement.getRoleName().trim().toLowerCase(Locale.ROOT)));
        Map<String, User> employeesByEmail = employees.stream().collect(Collectors.toMap(
                user -> user.getEmail().toLowerCase(Locale.ROOT), Function.identity(), (first, ignored) -> first));
        List<Gap> result = new ArrayList<>();

        for (AssessmentScore score : latest.values()) {
            User employee = employeesByEmail.get(score.getEmployeeEmail().toLowerCase(Locale.ROOT));
            if (employee == null || score.getTotalQuestions() <= 0) continue;
           int current = Math.toIntExact(Math.round(scorePercent(score)));
            int target = score.getTargetAnswers() * 100 / score.getTotalQuestions();
            target = roleBenchmark(employee, score.getTopic(), requirementsByRole).orElse(target);
            result.add(new Gap(employee, score.getTopic(), current, target, Math.max(0, target - current)));
        }

        for (User employee : employees) {
            List<RoleRequirement> requirements = requirementsFor(employee, requirementsByRole);
            if (requirements == null) continue;
            for (RoleRequirement requirement : requirements) {
                boolean assessed = latest.containsKey(employee.getEmail().toLowerCase(Locale.ROOT) + "|"
                        + requirement.getCompetency().toLowerCase(Locale.ROOT));
                if (!assessed) {
                    int target = proficiencyPercent(requirement.getRequiredProficiency());
                    result.add(new Gap(employee, requirement.getCompetency(), 0, target, target));
                }
            }
        }
        return result.stream().sorted(Comparator.comparingInt(Gap::gap).reversed()).toList();
    }

    private Optional<Integer> roleBenchmark(
            User employee,
            String competency,
            Map<String, List<RoleRequirement>> requirementsByRole) {
        List<RoleRequirement> requirements = requirementsFor(employee, requirementsByRole);
        if (requirements == null) return Optional.empty();
        return requirements.stream()
                .filter(requirement -> requirement.getCompetency().equalsIgnoreCase(competency))
                .map(requirement -> proficiencyPercent(requirement.getRequiredProficiency()))
                .findFirst();
    }

    private List<RoleRequirement> requirementsFor(
            User employee, Map<String, List<RoleRequirement>> requirementsByRole) {
        List<RoleRequirement> byDepartment = employee.getDepartment() == null ? null
                : requirementsByRole.get(employee.getDepartment().trim().toLowerCase(Locale.ROOT));
        if (byDepartment != null) return byDepartment;
        String role = employee.getRequestedRole();
        if (role == null) return null;
        String normalizedRole = role.replaceFirst("(?i)^ROLE_", "")
                .replace('_', ' ').trim().toLowerCase(Locale.ROOT);
        return requirementsByRole.get(normalizedRole);
    }

    private int proficiencyPercent(String proficiency) {
        if (proficiency == null) return 70;
        String value = proficiency.toLowerCase(Locale.ROOT);
        if (value.contains("beginner") || value.contains("basic")) return 50;
        if (value.contains("advanced") || value.contains("expert")) return 90;
        try {
            int numeric = Integer.parseInt(value.replace("%", "").trim());
            return Math.max(0, Math.min(100, numeric));
        } catch (NumberFormatException ignored) {
            return 70;
        }
    }

    private Optional<User> bestMentor(List<User> mentors, String competency) {
        String target = competency.toLowerCase(Locale.ROOT);
        return mentors.stream()
                .filter(mentor -> mentor.getExpertise() != null)
                .filter(mentor -> List.of(mentor.getExpertise().split("[,;|]")).stream()
                        .map(String::trim)
                        .anyMatch(skill -> !skill.isBlank()
                                && (skill.equalsIgnoreCase(competency)
                                        || skill.toLowerCase(Locale.ROOT).contains(target)
                                        || target.contains(skill.toLowerCase(Locale.ROOT)))))
                .min(Comparator.comparing(User::getEmail, String.CASE_INSENSITIVE_ORDER));
    }

    private String learningTitle(String competency) {
        return resources.findByActiveTrueOrderByTitleAsc().stream()
                .filter(resource -> matchesResource(resource, competency))
                .map(LearningResource::getTitle)
                .findFirst()
                .orElse(competency + " Skill Development Plan");
    }

    private boolean matchesResource(LearningResource resource, String competency) {
        String target = competency.toLowerCase(Locale.ROOT);
        return contains(resource.getCompetency(), target) || contains(resource.getCategory(), target)
                || contains(resource.getTitle(), target);
    }

    private boolean contains(String value, String target) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(target);
    }

    private void enrollEmployee(User employee, User mentor, String learningTitle) {
        LearningEnrollment enrollment = enrollments
                .findFirstByEmployeeEmailIgnoreCaseAndLearningTitleIgnoreCase(employee.getEmail(), learningTitle)
                .orElseGet(LearningEnrollment::new);
        enrollment.setEmployeeEmail(employee.getEmail());
        enrollment.setLearningTitle(learningTitle);
        if (enrollment.getStatus() == null || enrollment.getStatus().isBlank()) {
            enrollment.setStatus("PENDING");
            enrollment.setProgressPercent(0);
        }
        if (mentor != null) enrollment.setMentorEmail(mentor.getEmail());
        enrollment.setUpdatedAt(Instant.now());
        enrollments.save(enrollment);
    }

    private Map<String, Object> notification(User recipient, String audience, String title, String message) {
        HrNotification notification = new HrNotification();
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setAudience(audience);
        notification.setRecipientEmail(recipient.getEmail());
        notification.setSentAt(Instant.now());
        notification = notifications.save(notification);
        return Map.of(
                "notification_id", notification.getId(),
                "event", "skill_gap_plan_assigned",
                "recipient_id", recipient.getId(),
                "recipient_email", recipient.getEmail(),
                "audience", audience,
                "channel", "in_app",
                "title", title,
                "message", message,
                "sent_at", notification.getSentAt().toString());
    }

    private Map<String, Object> programView(
            GeneratedSkillProgram program, User employee, User mentor, boolean created) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("program_id", program.getId());
        result.put("program_name", program.getLearningTitle());
        result.put("competency", program.getCompetency());
        result.put("current_score", program.getCurrentScore());
        result.put("target_score", program.getTargetScore());
        result.put("gap_percent", program.getGapPercent());
        result.put("target_employee_id", program.getEmployeeId());
        result.put("target_employee_email", program.getEmployeeEmail());
        result.put("target_employee_name", employee == null ? program.getEmployeeEmail() : displayName(employee));
        result.put("mentor_id", program.getMentorId());
        result.put("mentor_email", program.getMentorEmail());
        result.put("mentor_name", mentor == null ? null : displayName(mentor));
        result.put("status", program.getStatus());
        result.put("created", created);
        result.put("created_at", program.getCreatedAt().toString());
        return result;
    }

    private User mentorById(List<User> mentors, Long id) {
        return id == null ? null : findUser(mentors, id);
    }

    private User findUser(List<User> group, Long id) {
        if (id == null) return null;
        return group.stream().filter(user -> id.equals(user.getId())).findFirst().orElse(null);
    }

    private List<User> activeUsers(String role) {
        return users.findByRole(role).stream()
                .filter(user -> user.getStatus() == null || "APPROVED".equalsIgnoreCase(user.getStatus()))
                .toList();
    }

    private double scorePercent(AssessmentScore score) {
        return score.getTotalQuestions() <= 0 ? 0
                : score.getRightAnswers() * 100.0 / score.getTotalQuestions();
    }

    private String normalizeStatus(String status) {
        return status == null || status.isBlank() ? "PENDING" : status.toUpperCase(Locale.ROOT);
    }

    private String displayName(User user) {
        String name = ((user.getFirstName() == null ? "" : user.getFirstName().trim()) + " "
                + (user.getLastName() == null ? "" : user.getLastName().trim())).trim();
        return name.isBlank() ? user.getEmail() : name;
    }

    private Optional<User> authenticatedHr(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) return Optional.empty();
        String token = authorization.substring(7);
        if (!tokens.validateToken(token)) return Optional.empty();
        try {
            return users.findByEmail(tokens.getEmailFromJWT(token))
                    .filter(user -> "APPROVED".equalsIgnoreCase(user.getStatus())
                            && ("ROLE_HR".equals(user.getRole()) || "ROLE_ADMIN".equals(user.getRole())));
        } catch (RuntimeException exception) {
            return Optional.empty();
        }
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "A valid HR session is required."));
    }

    private record Gap(User employee, String competency, int current, int target, int gap) {
    }
}
