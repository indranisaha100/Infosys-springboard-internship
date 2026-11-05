
package com.knowledgegap.backend.service;

import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.model.AssessmentScore;
import com.knowledgegap.backend.repository.UserRepository;
import com.knowledgegap.backend.repository.AssessmentScoreRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ManagerDashboardService {

    private final UserRepository userRepository;
    private final AssessmentScoreRepository assessmentScoreRepository;

    public ManagerDashboardService(
            UserRepository userRepository,
            AssessmentScoreRepository assessmentScoreRepository) {

        this.userRepository = userRepository;
        this.assessmentScoreRepository = assessmentScoreRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardData(User manager) {

        List<User> users = userRepository.findAll();

        List<User> employees = users.stream()
                .filter(u -> "ROLE_EMPLOYEE".equals(u.getRole()))
                .sorted(Comparator.comparing(
                        u -> safe(u.getFirstName()) + safe(u.getLastName()),
                        String.CASE_INSENSITIVE_ORDER))
                .toList();

        List<User> mentors = users.stream()
                .filter(u -> "ROLE_MENTOR".equals(u.getRole()))
                .sorted(Comparator.comparing(
                        u -> safe(u.getFirstName()) + safe(u.getLastName()),
                        String.CASE_INSENSITIVE_ORDER))
                .toList();

        List<AssessmentScore> scores =
                assessmentScoreRepository.findAllByOrderBySubmittedAtDesc();

        Map<String, List<AssessmentScore>> scoresByEmployee =
                scores.stream().collect(Collectors.groupingBy(
                        s -> normalize(s.getEmployeeEmail())));

        // EMPLOYEE DETAILS

        List<Map<String, Object>> employeeList = employees.stream()
                .map(employee -> employeeDetails(
                        employee,
                        scoresByEmployee.getOrDefault(
                                normalize(employee.getEmail()), List.of())))
                .toList();

        // MENTOR DETAILS

        List<Map<String, Object>> mentorList = mentors.stream()
                .map(this::mentorDetails)
                .toList();

        // ASSESSMENT DETAILS

        List<Map<String, Object>> assessmentList = scores.stream()
                .map(score -> {

                    User employee = userRepository
                            .findByEmail(score.getEmployeeEmail())
                            .orElse(null);

                    int percentage = calculatePercentage(score);

                    Map<String, Object> item = new LinkedHashMap<>();

                    item.put("employee",
                            employee == null
                                    ? score.getEmployeeEmail()
                                    : displayName(employee));

                    item.put("email", score.getEmployeeEmail());
                    item.put("topic", score.getTopic());
                    item.put("score", percentage);
                    item.put("right", score.getRightAnswers());
                    item.put("total", score.getTotalQuestions());
                    item.put("target", score.getTargetAnswers());
                    item.put("submittedAt", score.getSubmittedAt());

                    item.put("status",
                            percentage < 40 ? "Critical"
                                    : percentage < 70 ? "Needs Improvement"
                                    : "Good");

                    return item;
                })
                .toList();

        // SKILL COVERAGE

        Map<String, List<AssessmentScore>> scoresByTopic =
                scores.stream().collect(Collectors.groupingBy(
                        AssessmentScore::getTopic,
                        TreeMap::new,
                        Collectors.toList()));

        List<Map<String, Object>> skillCoverage =
                scoresByTopic.entrySet().stream()
                        .map(entry -> {

                            List<AssessmentScore> topicScores =
                                    entry.getValue();

                            double average = topicScores.stream()
                                    .mapToInt(this::calculatePercentage)
                                    .average()
                                    .orElse(0);

                            long affectedEmployees = topicScores.stream()
                                    .filter(s -> calculatePercentage(s) < 70)
                                    .map(s -> normalize(s.getEmployeeEmail()))
                                    .distinct()
                                    .count();

                            Map<String, Object> item =
                                    new LinkedHashMap<>();

                            item.put("name", entry.getKey());
                            item.put("averageScore",
                                    Math.round(average * 10.0) / 10.0);
                            item.put("affectedEmployees",
                                    affectedEmployees);
                            item.put("assessmentCount",
                                    topicScores.size());

                            return item;
                        })
                        .toList();

        // LATEST SCORE FOR EACH EMPLOYEE AND TOPIC

        Map<String, AssessmentScore> latestScores =
                new LinkedHashMap<>();

        for (AssessmentScore score : scores) {

            String key = normalize(score.getEmployeeEmail())
                    + "|" + safe(score.getTopic()).toLowerCase(Locale.ROOT);

            latestScores.putIfAbsent(key, score);
        }

        // EMPLOYEE-WISE HEATMAP

        List<Map<String, Object>> heatmap = new ArrayList<>();

        for (User employee : employees) {

            Map<String, Object> row = new LinkedHashMap<>();

            row.put("employee", displayName(employee));
            row.put("email", employee.getEmail());

            Map<String, Integer> skillScores = new LinkedHashMap<>();

            for (String topic : scoresByTopic.keySet()) {

                String key = normalize(employee.getEmail())
                        + "|" + topic.toLowerCase(Locale.ROOT);

                AssessmentScore score = latestScores.get(key);

                skillScores.put(
                        topic,
                        score == null ? -1 : calculatePercentage(score)
                );
            }

            row.put("skills", skillScores);

            heatmap.add(row);
        }

        // CRITICAL ALERTS - LATEST RESULT PER EMPLOYEE AND SKILL

        List<Map<String, Object>> criticalAlerts =
                latestScores.values().stream()
                        .filter(score -> calculatePercentage(score) < 40)
                        .limit(20)
                        .map(score -> {

                            User employee = userRepository
                                    .findByEmail(score.getEmployeeEmail())
                                    .orElse(null);

                            Map<String, Object> alert =
                                    new LinkedHashMap<>();

                            alert.put("employee",
                                    employee == null
                                            ? score.getEmployeeEmail()
                                            : displayName(employee));

                            alert.put("email", score.getEmployeeEmail());
                            alert.put("topic", score.getTopic());
                            alert.put("score", calculatePercentage(score));
                            alert.put("submittedAt", score.getSubmittedAt());
                            alert.put("status", "Critical");

                            return alert;
                        })
                        .toList();

        // UNIQUE EMPLOYEES WITH GAPS

        long employeesWithGaps = latestScores.values().stream()
                .filter(s -> calculatePercentage(s) < 70)
                .map(s -> normalize(s.getEmployeeEmail()))
                .distinct()
                .count();

        long criticalGapCount = latestScores.values().stream()
                .filter(s -> calculatePercentage(s) < 40)
                .count();

        double averageScore = latestScores.values().stream()
                .mapToInt(this::calculatePercentage)
                .average()
                .orElse(0);

        long assessedEmployees = latestScores.values().stream()
                .map(s -> normalize(s.getEmployeeEmail()))
                .distinct()
                .count();

        // MANAGER PROFILE

        Map<String, Object> managerInfo = new LinkedHashMap<>();

        managerInfo.put("id", manager.getId());
        managerInfo.put("firstName", safe(manager.getFirstName()));
        managerInfo.put("lastName", safe(manager.getLastName()));
        managerInfo.put("email", safe(manager.getEmail()));
        managerInfo.put("role", manager.getRole());

        // SUMMARY

        Map<String, Object> summary = new LinkedHashMap<>();

        summary.put("totalEmployees", employees.size());
        summary.put("totalMentors", mentors.size());
        summary.put("totalAssessments", scores.size());
        summary.put("assessedEmployees", assessedEmployees);
        summary.put("employeesWithGaps", employeesWithGaps);
        summary.put("criticalGaps", criticalGapCount);
        summary.put("averageScore",
                Math.round(averageScore * 10.0) / 10.0);

        // FINAL RESPONSE

        Map<String, Object> result = new LinkedHashMap<>();

        result.put("manager", managerInfo);
        result.put("summary", summary);

        result.put("employees", employeeList);
        result.put("mentors", mentorList);

        result.put("assessments", assessmentList);
        result.put("skillCoverage", skillCoverage);
        result.put("heatmap", heatmap);
        result.put("criticalAlerts", criticalAlerts);

        // Training data is not yet configured.

        result.put("trainingAvailable", false);
        result.put("trainingMessage",
                "Training enrollment data has not been configured yet.");

        return result;
    }

    // EMPLOYEE DETAILS

    private Map<String, Object> employeeDetails(
            User employee,
            List<AssessmentScore> scores) {

        Map<String, Object> item = new LinkedHashMap<>();

        double average = scores.stream()
                .mapToInt(this::calculatePercentage)
                .average()
                .orElse(0);

        item.put("id", employee.getId());
        item.put("firstName", safe(employee.getFirstName()));
        item.put("lastName", safe(employee.getLastName()));
        item.put("name", displayName(employee));
        item.put("email", safe(employee.getEmail()));
        item.put("role", employee.getRole());

        item.put("assessmentCount", scores.size());

        item.put("averageScore",
                Math.round(average * 10.0) / 10.0);

        item.put("status",
                scores.isEmpty() ? "Assessment Pending"
                        : average < 40 ? "Critical"
                        : average < 70 ? "Needs Improvement"
                        : "Good");

        item.put("assessments", scores.stream()
                .map(s -> {

                    Map<String, Object> result =
                            new LinkedHashMap<>();

                    result.put("topic", s.getTopic());
                    result.put("score", calculatePercentage(s));
                    result.put("submittedAt", s.getSubmittedAt());

                    return result;
                })
                .toList());

        return item;
    }

    // MENTOR DETAILS

    private Map<String, Object> mentorDetails(User mentor) {

        Map<String, Object> item = new LinkedHashMap<>();

        item.put("id", mentor.getId());
        item.put("firstName", safe(mentor.getFirstName()));
        item.put("lastName", safe(mentor.getLastName()));
        item.put("name", displayName(mentor));
        item.put("email", safe(mentor.getEmail()));
        item.put("role", mentor.getRole());

        return item;
    }

    // CALCULATE ASSESSMENT PERCENTAGE

    private int calculatePercentage(AssessmentScore score) {

        if (score.getTotalQuestions() <= 0) {
            return 0;
        }

        return Math.round(
                score.getRightAnswers() * 100f
                        / score.getTotalQuestions());
    }

    // EMPLOYEE DISPLAY NAME

    private String displayName(User user) {

        String name = (
                safe(user.getFirstName()) + " "
                        + safe(user.getLastName())
        ).trim();

        return name.isBlank() ? safe(user.getEmail()) : name;
    }

    // NORMALIZE EMAIL

    private String normalize(String value) {

        return value == null
                ? ""
                : value.trim().toLowerCase(Locale.ROOT);
    }

    // HANDLE NULL VALUES

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
