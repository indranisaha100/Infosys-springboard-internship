package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.model.AssessmentScore;
import com.knowledgegap.backend.model.Competency;
import com.knowledgegap.backend.model.RoleRequirement;
import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.*;
import com.knowledgegap.backend.security.JwtTokenProvider;
import com.knowledgegap.backend.service.RoleBenchmarkRules;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Makes role benchmarks manageable and measurable: edit/delete, dropdown options, and an impact view
 * showing how many employees each benchmark actually applies to and how they currently score.
 */
@RestController
@RequestMapping("/api/hr/role-requirements")
public class HrRoleBenchmarkController {
    private final RoleRequirementRepository requirements;
    private final UserRepository users;
    private final AssessmentScoreRepository scores;
    private final DepartmentRepository departments;
    private final CompetencyRepository competencies;
    private final JwtTokenProvider tokens;

    public HrRoleBenchmarkController(RoleRequirementRepository requirements, UserRepository users,
            AssessmentScoreRepository scores, DepartmentRepository departments,
            CompetencyRepository competencies, JwtTokenProvider tokens) {
        this.requirements = requirements;
        this.users = users;
        this.scores = scores;
        this.departments = departments;
        this.competencies = competencies;
        this.tokens = tokens;
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> update(@RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id, @RequestBody RoleRequirement input) {
        if (!isHr(auth)) return unauthorized();
        Optional<RoleRequirement> optional = requirements.findById(id);
        if (optional.isEmpty()) return ResponseEntity.notFound().build();
        if (blank(input.getRoleName()) || blank(input.getCompetency())) return bad("Role name and competency are required.");
        Optional<String> proficiency = RoleBenchmarkRules.normalizeProficiency(input.getRequiredProficiency());
        if (proficiency.isEmpty()) {
            return bad("Target proficiency must be Beginner, Intermediate, Advanced, Expert or a percentage from 1 to 100.");
        }
        boolean duplicate = requirements.findAllByOrderByRoleNameAsc().stream().anyMatch(other ->
                !other.getId().equals(id)
                        && other.getRoleName().trim().equalsIgnoreCase(input.getRoleName().trim())
                        && other.getCompetency().trim().equalsIgnoreCase(input.getCompetency().trim()));
        if (duplicate) return bad("Another benchmark already exists for this role and competency.");
        RoleRequirement existing = optional.get();
        existing.setRoleName(input.getRoleName().trim());
        existing.setCompetency(input.getCompetency().trim());
        existing.setRequiredProficiency(proficiency.get());
        return ResponseEntity.ok(requirements.save(existing));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> delete(@RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id) {
        if (!isHr(auth)) return unauthorized();
        if (!requirements.existsById(id)) return ResponseEntity.notFound().build();
        requirements.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /** Values to offer in the form so HR picks names that will really match employees and assessments. */
    @GetMapping("/options")
    @Transactional(readOnly = true)
    public ResponseEntity<?> options(@RequestHeader(value = "Authorization", required = false) String auth) {
        if (!isHr(auth)) return unauthorized();
        Set<String> roles = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        departments.findAllByOrderByNameAsc().forEach(department -> roles.add(department.getName()));
        users.findByRole("ROLE_EMPLOYEE").forEach(user -> {
            if (!blank(user.getDepartment())) roles.add(user.getDepartment().trim());
        });
        roles.addAll(List.of("Employee", "Manager", "Mentor"));

        Set<String> skills = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        competencies.findByActiveTrueOrderByNameAsc().stream().map(Competency::getName).forEach(skills::add);
        scores.findAll().forEach(score -> skills.add(score.getTopic()));
        return ResponseEntity.ok(Map.of("roles", roles, "competencies", skills,
                "proficiencies", List.of("Beginner", "Intermediate", "Advanced", "Expert")));
    }

    /** One row per benchmark: who it covers and how those employees currently compare with the target. */
    @GetMapping("/impact")
    @Transactional(readOnly = true)
    public ResponseEntity<?> impact(@RequestHeader(value = "Authorization", required = false) String auth) {
        if (!isHr(auth)) return unauthorized();

        List<RoleRequirement> all = requirements.findAllByOrderByRoleNameAsc();
        Map<String, List<RoleRequirement>> byRole = all.stream()
                .collect(Collectors.groupingBy(r -> RoleBenchmarkRules.key(r.getRoleName())));
        List<User> employees = users.findByRole("ROLE_EMPLOYEE").stream()
                .filter(user -> user.getStatus() == null || "APPROVED".equalsIgnoreCase(user.getStatus()))
                .toList();

        Map<String, AssessmentScore> latest = new HashMap<>();
        for (AssessmentScore score : scores.findAllByOrderBySubmittedAtDesc()) {
            latest.putIfAbsent(RoleBenchmarkRules.key(score.getEmployeeEmail()) + "|"
                    + RoleBenchmarkRules.key(score.getTopic()), score);
        }

        Map<Long, List<User>> coveredBy = new HashMap<>();
        for (User employee : employees) {
            List<RoleRequirement> applicable = RoleBenchmarkRules.requirementsFor(employee, byRole);
            if (applicable == null) continue;
            for (RoleRequirement requirement : applicable) {
                coveredBy.computeIfAbsent(requirement.getId(), ignored -> new ArrayList<>()).add(employee);
            }
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (RoleRequirement requirement : all) {
            int target = RoleBenchmarkRules.toPercent(requirement.getRequiredProficiency());
            List<User> covered = coveredBy.getOrDefault(requirement.getId(), List.of());
            int assessed = 0;
            int below = 0;
            double total = 0;
            for (User employee : covered) {
                AssessmentScore score = latest.get(RoleBenchmarkRules.key(employee.getEmail()) + "|"
                        + RoleBenchmarkRules.key(requirement.getCompetency()));
                if (score == null || score.getTotalQuestions() <= 0) {
                    below++;
                    continue;
                }
                double current = score.getRightAnswers() * 100.0 / score.getTotalQuestions();
                assessed++;
                total += current;
                if (current < target) below++;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", requirement.getId());
            row.put("roleName", requirement.getRoleName());
            row.put("competency", requirement.getCompetency());
            row.put("requiredProficiency", requirement.getRequiredProficiency());
            row.put("targetPercent", target);
            row.put("employeesCovered", covered.size());
            row.put("assessed", assessed);
            row.put("notAssessed", covered.size() - assessed);
            row.put("belowTarget", below);
            row.put("averageScore", assessed == 0 ? null : Math.round(total / assessed));
            rows.add(row);
        }
        return ResponseEntity.ok(rows);
    }

    private boolean isHr(String auth) {
        if (auth == null || !auth.startsWith("Bearer ")) return false;
        String token = auth.substring(7);
        if (!tokens.validateToken(token)) return false;
        try {
            return users.findByEmail(tokens.getEmailFromJWT(token))
                    .map(user -> "ROLE_HR".equals(user.getRole()) || "ROLE_ADMIN".equals(user.getRole()))
                    .orElse(false);
        } catch (RuntimeException exception) {
            return false;
        }
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "A valid HR session is required."));
    }

    private ResponseEntity<?> bad(String message) {
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
