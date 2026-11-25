package com.knowledgegap.backend.service;

import com.knowledgegap.backend.model.LearningEnrollment;
import com.knowledgegap.backend.model.MentorshipRequest;
import com.knowledgegap.backend.model.TrainingProgramme;
import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.LearningEnrollmentRepository;
import com.knowledgegap.backend.repository.MentorshipRequestRepository;
import com.knowledgegap.backend.repository.TrainingProgrammeRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * The Department Head sees exactly what a manager sees (assessments, coverage, every heatmap,
 * alerts, reports) but only for the employees HR assigned to them, plus department learning data.
 */
@Service
public class DepartmentHeadDashboardService {

    private final ManagerDashboardService managerDashboardService;
    private final DepartmentScopeService scope;
    private final LearningEnrollmentRepository learningEnrollmentRepository;
    private final MentorshipRequestRepository mentorshipRequestRepository;
    private final TrainingProgrammeRepository trainingProgrammeRepository;

    public DepartmentHeadDashboardService(
            ManagerDashboardService managerDashboardService,
            DepartmentScopeService scope,
            LearningEnrollmentRepository learningEnrollmentRepository,
            MentorshipRequestRepository mentorshipRequestRepository,
            TrainingProgrammeRepository trainingProgrammeRepository) {
        this.managerDashboardService = managerDashboardService;
        this.scope = scope;
        this.learningEnrollmentRepository = learningEnrollmentRepository;
        this.mentorshipRequestRepository = mentorshipRequestRepository;
        this.trainingProgrammeRepository = trainingProgrammeRepository;
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public Map<String, Object> getDashboardData(User head) {
        List<User> employees = scope.employeesOf(head);
        List<User> mentors = scope.mentorsOf(head);
        String departmentName = head.getDepartment() == null ? "" : head.getDepartment().trim();

        Map<String, Object> result = new LinkedHashMap<>(
                managerDashboardService.getDashboardData(head, employees, mentors));

        // Heatmap-derived counts (latest score per employee and topic; -1 means not assessed).
        int onTrack = 0;
        int attention = 0;
        int critical = 0;
        for (Map<String, Object> row : (List<Map<String, Object>>) result.get("heatmap")) {
            Map<String, Integer> skills = (Map<String, Integer>) row.get("skills");
            for (Integer score : skills.values()) {
                if (score == null || score < 0) continue;
                if (score < 40) critical++;
                else if (score < 70) attention++;
                else onTrack++;
            }
        }
        Map<String, Object> summary = new LinkedHashMap<>((Map<String, Object>) result.get("summary"));
        summary.put("onTrackResults", onTrack);
        summary.put("attentionResults", attention);
        summary.put("criticalResults", critical);
        summary.put("notAssessed", Math.max(0,
                employees.size() - ((Number) summary.get("assessedEmployees")).longValue()));
        result.put("summary", summary);

        Set<String> emails = employees.stream()
                .map(u -> u.getEmail().toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());

        // Learning
        List<LearningEnrollment> enrollments = learningEnrollmentRepository
                .findAllByOrderByUpdatedAtDesc().stream()
                .filter(e -> e.getEmployeeEmail() != null
                        && emails.contains(e.getEmployeeEmail().toLowerCase(Locale.ROOT)))
                .toList();
        long completed = enrollments.stream().filter(e -> statusIs(e.getStatus(), "COMPLETED")).count();
        long inProgress = enrollments.stream().filter(e -> statusIs(e.getStatus(), "IN_PROGRESS")).count();
        long enrolledEmployees = enrollments.stream()
                .map(e -> e.getEmployeeEmail().toLowerCase(Locale.ROOT)).distinct().count();
        Map<String, Object> learning = new LinkedHashMap<>();
        learning.put("totalEnrollments", enrollments.size());
        learning.put("completed", completed);
        learning.put("inProgress", inProgress);
        learning.put("pending", Math.max(0, enrollments.size() - completed - inProgress));
        learning.put("enrolledEmployees", enrolledEmployees);
        learning.put("adoptionRate", employees.isEmpty() ? 0
                : Math.round(enrolledEmployees * 1000.0 / employees.size()) / 10.0);
        result.put("learning", learning);

        // Mentoring
        List<MentorshipRequest> requests = mentorshipRequestRepository.findAll().stream()
                .filter(r -> r.getEmployeeEmail() != null
                        && emails.contains(r.getEmployeeEmail().toLowerCase(Locale.ROOT)))
                .toList();
        Map<String, Object> mentoring = new LinkedHashMap<>();
        mentoring.put("totalRequests", requests.size());
        mentoring.put("pending", countStatus(requests, "PENDING"));
        mentoring.put("accepted", countStatus(requests, "ACCEPTED"));
        mentoring.put("completed", countStatus(requests, "COMPLETED"));
        result.put("mentoring", mentoring);

        // Programmes for this department
        result.put("programmes", trainingProgrammeRepository.findAllByOrderByStartDateAsc().stream()
                .filter(p -> p.getDepartment() != null && !departmentName.isBlank()
                        && p.getDepartment().trim().equalsIgnoreCase(departmentName))
                .map(this::programmeRow)
                .toList());

        Map<String, Object> department = new LinkedHashMap<>();
        department.put("name", departmentName.isBlank() ? "Not assigned" : departmentName);
        department.put("totalEmployees", employees.size());
        department.put("totalMentors", mentors.size());
        result.put("department", department);

        Map<String, Object> headInfo = new LinkedHashMap<>();
        headInfo.put("firstName", head.getFirstName());
        headInfo.put("lastName", head.getLastName());
        headInfo.put("email", head.getEmail());
        headInfo.put("department", departmentName);
        result.put("departmentHead", headInfo);

        return result;
    }

    private boolean statusIs(String status, String expected) {
        return status != null && expected.equals(status.trim().toUpperCase(Locale.ROOT).replace(' ', '_'));
    }

    private long countStatus(List<MentorshipRequest> requests, String expected) {
        return requests.stream().filter(r -> expected.equalsIgnoreCase(
                r.getStatus() == null ? "" : r.getStatus().trim())).count();
    }

    private Map<String, Object> programmeRow(TrainingProgramme programme) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", programme.getId());
        row.put("name", programme.getName());
        row.put("competency", programme.getCompetency());
        row.put("status", programme.getStatus());
        row.put("startDate", programme.getStartDate());
        row.put("endDate", programme.getEndDate());
        return row;
    }
}
