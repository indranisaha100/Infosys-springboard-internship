package com.knowledgegap.backend.service;

import com.knowledgegap.backend.model.AssessmentScore;
import com.knowledgegap.backend.model.LearningEnrollment;
import com.knowledgegap.backend.model.MentorshipRequest;
import com.knowledgegap.backend.model.TrainingProgramme;
import com.knowledgegap.backend.model.User;

import com.knowledgegap.backend.repository.AssessmentScoreRepository;
import com.knowledgegap.backend.repository.LearningEnrollmentRepository;
import com.knowledgegap.backend.repository.MentorshipRequestRepository;
import com.knowledgegap.backend.repository.TrainingProgrammeRepository;
import com.knowledgegap.backend.repository.UserRepository;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class DepartmentHeadDashboardService {

    private static final double CRITICAL_THRESHOLD = 40.0;
    private static final double ATTENTION_THRESHOLD = 70.0;

    private final UserRepository userRepository;
    private final AssessmentScoreRepository assessmentScoreRepository;
    private final LearningEnrollmentRepository learningEnrollmentRepository;
    private final MentorshipRequestRepository mentorshipRequestRepository;
    private final TrainingProgrammeRepository trainingProgrammeRepository;

    public DepartmentHeadDashboardService(
            UserRepository userRepository,
            AssessmentScoreRepository assessmentScoreRepository,
            LearningEnrollmentRepository learningEnrollmentRepository,
            MentorshipRequestRepository mentorshipRequestRepository,
            TrainingProgrammeRepository trainingProgrammeRepository) {

        this.userRepository = userRepository;
        this.assessmentScoreRepository = assessmentScoreRepository;
        this.learningEnrollmentRepository = learningEnrollmentRepository;
        this.mentorshipRequestRepository = mentorshipRequestRepository;
        this.trainingProgrammeRepository = trainingProgrammeRepository;
    }

    public Map<String, Object> getDashboardData(User departmentHead) {

        String departmentName = departmentHead.getDepartment().trim();

        List<User> departmentUsers = userRepository.findAll().stream()
                .filter(this::isApproved)
                .filter(user -> sameDepartment(
                        user.getDepartment(), departmentName))
                .sorted(Comparator.comparing(
                        user -> safe(user.getFirstName()) + " "
                                + safe(user.getLastName()),
                        String.CASE_INSENSITIVE_ORDER))
                .toList();

        List<User> employees = departmentUsers.stream()
                .filter(user -> "ROLE_EMPLOYEE".equals(user.getRole()))
                .toList();

        Set<String> employeeEmails = employees.stream()
                .map(User::getEmail)
                .filter(email -> email != null && !email.isBlank())
                .collect(Collectors.toSet());

        // Latest assessment per employee and topic.
        // Repository results are ordered newest first.

        Map<String, AssessmentScore> latestByEmployeeAndTopic =
                new LinkedHashMap<>();

        for (AssessmentScore score :
                assessmentScoreRepository.findAllByOrderBySubmittedAtDesc()) {

            if (employeeEmails.contains(score.getEmployeeEmail())
                    && score.getTotalQuestions() > 0) {

                String key = score.getEmployeeEmail()
                        .toLowerCase(Locale.ROOT)
                        + "::"
                        + safe(score.getTopic()).toLowerCase(Locale.ROOT);

                latestByEmployeeAndTopic.putIfAbsent(key, score);
            }
        }

        Map<String, User> employeeByEmail = employees.stream()
                .collect(Collectors.toMap(
                        user -> user.getEmail().toLowerCase(Locale.ROOT),
                        Function.identity(),
                        (first, second) -> first
                ));

        List<Map<String, Object>> assessmentRows =
                new ArrayList<>();

        Map<String, List<Double>> scoresByTopic =
                new LinkedHashMap<>();

        Map<String, Integer> riskByTopic =
                new HashMap<>();

        Map<String, Integer> criticalByTopic =
                new HashMap<>();

        int criticalResults = 0;
        int attentionResults = 0;
        int onTrackResults = 0;

        Set<String> assessedEmployees =
                new java.util.HashSet<>();

        Set<String> employeesWithGaps =
                new java.util.HashSet<>();

        for (AssessmentScore score :
                latestByEmployeeAndTopic.values()) {

            double percentage = round(
                    (score.getRightAnswers() * 100.0)
                            / score.getTotalQuestions()
            );

            String topic = safe(score.getTopic());
            String email = score.getEmployeeEmail();

            User employee = employeeByEmail.get(
                    email.toLowerCase(Locale.ROOT)
            );

            String name = employee == null
                    ? email
                    : fullName(employee);

            String status = percentage < CRITICAL_THRESHOLD
                    ? "Critical"
                    : percentage < ATTENTION_THRESHOLD
                    ? "Needs attention"
                    : "On track";

            if (percentage < CRITICAL_THRESHOLD) {

                criticalResults++;

                employeesWithGaps.add(
                        email.toLowerCase(Locale.ROOT)
                );

                criticalByTopic.merge(topic, 1, Integer::sum);
                riskByTopic.merge(topic, 1, Integer::sum);

            } else if (percentage < ATTENTION_THRESHOLD) {

                attentionResults++;

                employeesWithGaps.add(
                        email.toLowerCase(Locale.ROOT)
                );

                riskByTopic.merge(topic, 1, Integer::sum);

            } else {

                onTrackResults++;
            }

            assessedEmployees.add(
                    email.toLowerCase(Locale.ROOT)
            );

            scoresByTopic.computeIfAbsent(
                    topic,
                    ignored -> new ArrayList<>()
            ).add(percentage);

            Map<String, Object> row = new LinkedHashMap<>();

            row.put("employeeName", name);
            row.put("email", email);
            row.put("topic", topic);
            row.put("score", percentage);
            row.put("status", status);
            row.put("rightAnswers", score.getRightAnswers());
            row.put("totalQuestions", score.getTotalQuestions());
            row.put("submittedAt", score.getSubmittedAt());

            assessmentRows.add(row);
        }

        // Calculate skill-wise averages.

        List<Map<String, Object>> skills =
                new ArrayList<>();

        for (Map.Entry<String, List<Double>> entry :
                scoresByTopic.entrySet()) {

            List<Double> values = entry.getValue();

            double average = values.stream()
                    .mapToDouble(Double::doubleValue)
                    .average()
                    .orElse(0.0);

            Map<String, Object> skill =
                    new LinkedHashMap<>();

            skill.put("name", entry.getKey());
            skill.put("averageScore", round(average));
            skill.put("assessedEmployees", values.size());

            skill.put(
                    "employeesAtRisk",
                    riskByTopic.getOrDefault(entry.getKey(), 0)
            );

            skill.put(
                    "criticalEmployees",
                    criticalByTopic.getOrDefault(entry.getKey(), 0)
            );

            skills.add(skill);
        }

        skills.sort(
                Comparator.comparing(
                        (Map<String, Object> item) ->
                                ((Number) item.get("employeesAtRisk"))
                                        .intValue()
                ).reversed().thenComparing(
                        item -> String.valueOf(item.get("name")),
                        String.CASE_INSENSITIVE_ORDER
                )
        );

        // Create employee skill heatmap.

        List<Map<String, Object>> heatmap =
                new ArrayList<>();

        for (User employee : employees) {

            Map<String, Object> row =
                    new LinkedHashMap<>();

            row.put("name", fullName(employee));
            row.put("email", employee.getEmail());

            Map<String, Double> employeeScores =
                    new LinkedHashMap<>();

            for (AssessmentScore score :
                    latestByEmployeeAndTopic.values()) {

                if (score.getEmployeeEmail()
                        .equalsIgnoreCase(employee.getEmail())) {

                    employeeScores.put(
                            score.getTopic(),
                            round(
                                    (score.getRightAnswers() * 100.0)
                                            / score.getTotalQuestions()
                            )
                    );
                }
            }

            row.put("scores", employeeScores);
            heatmap.add(row);
        }

        // Employee directory.

        List<Map<String, Object>> employeeRows =
                new ArrayList<>();

        for (User employee : employees) {

            Map<String, Object> row =
                    new LinkedHashMap<>();

            row.put("firstName", employee.getFirstName());
            row.put("lastName", employee.getLastName());
            row.put("email", employee.getEmail());
            row.put("role", employee.getRole());

            row.put(
                    "assessed",
                    assessedEmployees.contains(
                            employee.getEmail().toLowerCase(Locale.ROOT)
                    )
            );

            employeeRows.add(row);
        }

        // Priority alerts.

        List<Map<String, Object>> riskAlerts =
                assessmentRows.stream()
                        .filter(row ->
                                !"On track".equals(row.get("status")))
                        .sorted(Comparator.comparing(
                                row -> ((Number) row.get("score"))
                                        .doubleValue()
                        ))
                        .toList();

        // Learning enrollment statistics.

        List<LearningEnrollment> enrollments =
                learningEnrollmentRepository
                        .findAllByOrderByUpdatedAtDesc()
                        .stream()
                        .filter(enrollment ->
                                employeeEmails.contains(
                                        enrollment.getEmployeeEmail()
                                ))
                        .toList();

        int completed = 0;
        int inProgress = 0;

        for (LearningEnrollment enrollment : enrollments) {

            String status = safe(enrollment.getStatus())
                    .toUpperCase(Locale.ROOT)
                    .replace(' ', '_');

            if ("COMPLETED".equals(status)) {
                completed++;
            } else if ("IN_PROGRESS".equals(status)) {
                inProgress++;
            }
        }

        long enrolledEmployeeCount = enrollments.stream()
                .map(enrollment ->
                        enrollment.getEmployeeEmail()
                                .toLowerCase(Locale.ROOT))
                .distinct()
                .count();

        double adoptionRate = employees.isEmpty()
                ? 0.0
                : round(
                        enrolledEmployeeCount * 100.0
                                / employees.size()
                );

        // Mentorship statistics.

        List<MentorshipRequest> mentorshipRequests =
                mentorshipRequestRepository.findAll()
                        .stream()
                        .filter(request ->
                                request.getEmployeeEmail() != null
                                        && employeeEmails.contains(
                                                request.getEmployeeEmail()
                                        ))
                        .toList();

        int pendingMentoring =
                countStatus(mentorshipRequests, "PENDING");

        int acceptedMentoring =
                countStatus(mentorshipRequests, "ACCEPTED");

        int completedMentoring =
                countStatus(mentorshipRequests, "COMPLETED");

        // Department-specific programmes.

        List<Map<String, Object>> programmes =
                trainingProgrammeRepository
                        .findAllByOrderByStartDateAsc()
                        .stream()
                        .filter(programme ->
                                sameDepartment(
                                        programme.getDepartment(),
                                        departmentName
                                ))
                        .map(this::programmeRow)
                        .toList();

        // Department role counts.

        long totalWorkforce = departmentUsers.size();

        long managerCount = departmentUsers.stream()
                .filter(user ->
                        "ROLE_MANAGER".equals(user.getRole()))
                .count();

        long mentorCount = departmentUsers.stream()
                .filter(user ->
                        "ROLE_MENTOR".equals(user.getRole()))
                .count();

        long otherRoles = departmentUsers.stream()
                .filter(user ->
                        !Set.of(
                                "ROLE_EMPLOYEE",
                                "ROLE_MANAGER",
                                "ROLE_MENTOR",
                                "ROLE_DEPARTMENT_HEAD"
                        ).contains(user.getRole()))
                .count();

        double averageScore =
                latestByEmployeeAndTopic.values().stream()
                        .mapToDouble(score ->
                                score.getRightAnswers() * 100.0
                                        / score.getTotalQuestions())
                        .average()
                        .orElse(0.0);

        // Summary response.

        Map<String, Object> summary =
                new LinkedHashMap<>();

        summary.put("totalWorkforce", totalWorkforce);
        summary.put("totalEmployees", employees.size());
        summary.put("totalManagers", managerCount);
        summary.put("totalMentors", mentorCount);
        summary.put("otherRoles", otherRoles);
        summary.put("assessedEmployees", assessedEmployees.size());
        summary.put("employeesWithGaps", employeesWithGaps.size());
        summary.put("criticalGaps", criticalResults);
        summary.put("attentionResults", attentionResults);
        summary.put("onTrackResults", onTrackResults);
        summary.put("averageScore", round(averageScore));
        summary.put("totalAssessments",
                latestByEmployeeAndTopic.size());

        // Learning response.

        Map<String, Object> learning =
                new LinkedHashMap<>();

        learning.put("totalEnrollments", enrollments.size());
        learning.put("completed", completed);
        learning.put("inProgress", inProgress);

        learning.put(
                "pending",
                Math.max(0, enrollments.size() - completed - inProgress)
        );

        learning.put("enrolledEmployees", enrolledEmployeeCount);
        learning.put("adoptionRate", adoptionRate);

        // Mentoring response.

        Map<String, Object> mentoring =
                new LinkedHashMap<>();

        mentoring.put("totalRequests", mentorshipRequests.size());
        mentoring.put("pending", pendingMentoring);
        mentoring.put("accepted", acceptedMentoring);
        mentoring.put("completed", completedMentoring);

        // Department response.

        Map<String, Object> department =
                new LinkedHashMap<>();

        department.put("name", departmentName);
        department.put("totalWorkforce", totalWorkforce);

        // Department Head response.

        Map<String, Object> head =
                new LinkedHashMap<>();

        head.put("firstName", departmentHead.getFirstName());
        head.put("lastName", departmentHead.getLastName());
        head.put("email", departmentHead.getEmail());
        head.put("department", departmentName);

        // Final API response.

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put("department", department);
        response.put("departmentHead", head);
        response.put("summary", summary);
        response.put("employees", employeeRows);
        response.put("skills", skills);
        response.put("assessments", assessmentRows);
        response.put("heatmap", heatmap);
        response.put("riskAlerts", riskAlerts);
        response.put("learning", learning);
        response.put("mentoring", mentoring);
        response.put("programmes", programmes);

        return response;
    }

    private boolean isApproved(User user) {
        return user.getStatus() == null
                || "APPROVED".equalsIgnoreCase(user.getStatus());
    }

    private boolean sameDepartment(
            String first,
            String second) {

        return first != null
                && second != null
                && first.trim().equalsIgnoreCase(second.trim());
    }

    private int countStatus(
            List<MentorshipRequest> requests,
            String expected) {

        return (int) requests.stream()
                .filter(request ->
                        expected.equalsIgnoreCase(
                                safe(request.getStatus())))
                .count();
    }

    private Map<String, Object> programmeRow(
            TrainingProgramme programme) {

        Map<String, Object> row =
                new LinkedHashMap<>();

        row.put("id", programme.getId());
        row.put("name", programme.getName());
        row.put("competency", programme.getCompetency());
        row.put("status", programme.getStatus());
        row.put("startDate", programme.getStartDate());
        row.put("endDate", programme.getEndDate());

        return row;
    }

    private String fullName(User user) {

        String name = (
                safe(user.getFirstName())
                        + " "
                        + safe(user.getLastName())
        ).trim();

        return name.isBlank()
                ? user.getEmail()
                : name;
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}