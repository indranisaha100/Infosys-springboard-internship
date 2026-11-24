package com.knowledgegap.backend.service;

import com.knowledgegap.backend.model.AssessmentScore;
import com.knowledgegap.backend.model.LearningEnrollment;
import com.knowledgegap.backend.model.MentorshipRequest;
import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.AssessmentScoreRepository;
import com.knowledgegap.backend.repository.LearningEnrollmentRepository;
import com.knowledgegap.backend.repository.MentorshipRequestRepository;
import com.knowledgegap.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.*;

/**
 * Builds the employee dashboard payload from real rows only: latest assessment, learning
 * enrollments, mentorship requests and the people the employee is connected to.
 * Nothing in here is a constant - if there is no data the field is empty/zero, and the
 * front-end shows an empty state instead of invented numbers.
 */
@Service
public class EmployeeDashboardService {
    private final AssessmentScoreRepository scoreRepository;
    private final LearningEnrollmentRepository enrollmentRepository;
    private final MentorshipRequestRepository mentorshipRepository;
    private final UserRepository userRepository;
    private final LearningProgressService learning;
    private final MentorAssignmentService mentorAssignments;
    private final MentoringSessionService sessionService;

    public EmployeeDashboardService(AssessmentScoreRepository scoreRepository,
            LearningEnrollmentRepository enrollmentRepository, MentorshipRequestRepository mentorshipRepository,
            UserRepository userRepository, LearningProgressService learning,
            MentorAssignmentService mentorAssignments, MentoringSessionService sessionService) {
        this.scoreRepository = scoreRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.mentorshipRepository = mentorshipRepository;
        this.userRepository = userRepository;
        this.learning = learning;
        this.mentorAssignments = mentorAssignments;
        this.sessionService = sessionService;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> build(User employee) {
        List<AssessmentScore> saved = scoreRepository.findByEmployeeEmailOrderBySubmittedAtDesc(employee.getEmail());
        Map<Instant, List<AssessmentScore>> bySubmission = new LinkedHashMap<>();
        for (AssessmentScore s : saved) bySubmission.computeIfAbsent(s.getSubmittedAt(), k -> new ArrayList<>()).add(s);
        List<List<AssessmentScore>> submissions = new ArrayList<>(bySubmission.values());
        List<AssessmentScore> latest = submissions.isEmpty() ? List.of() : submissions.get(0);
        List<AssessmentScore> previous = submissions.size() > 1 ? submissions.get(1) : List.of();

        List<LearningEnrollment> courses = enrollmentRepository
                .findByEmployeeEmailIgnoreCaseOrderByUpdatedAtDesc(employee.getEmail());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("user", userSummary(employee));
        out.put("hasAssessment", !latest.isEmpty());
        out.put("lastAssessmentAt", latest.isEmpty() ? null : latest.get(0).getSubmittedAt());
        out.put("readiness", readiness(latest, previous));
        out.put("stats", stats(latest, courses));
        out.put("gaps", gaps(latest));
        out.put("assessments", assessmentRows(latest));
        out.put("learning", learningSummary(courses));
        out.put("focus", focus(courses));
        out.put("connections", connections(employee, courses));
        out.put("upcomingSessions", upcomingSessions(employee));
        return out;
    }

    // ------------------------------------------------------------------ assessment-derived

    private int pct(int part, int total) {
        return total <= 0 ? 0 : Math.round(part * 100f / total);
    }

    /** Average of "how much of the target have you reached", each capped at 100. */
    private int readinessScore(List<AssessmentScore> scores) {
        if (scores.isEmpty()) return 0;
        double sum = 0;
        for (AssessmentScore s : scores) {
            sum += s.getTargetAnswers() <= 0 ? 100 : Math.min(100.0, s.getRightAnswers() * 100.0 / s.getTargetAnswers());
        }
        return (int) Math.round(sum / scores.size());
    }

    private Map<String, Object> readiness(List<AssessmentScore> latest, List<AssessmentScore> previous) {
        Map<String, Object> r = new LinkedHashMap<>();
        if (latest.isEmpty()) {
            r.put("score", null);
            r.put("label", "Not assessed yet");
            r.put("change", null);
            r.put("changeLabel", "Take the skill assessment to get your score");
            return r;
        }
        int score = readinessScore(latest);
        r.put("score", score);
        r.put("label", score >= 90 ? "On target" : score >= 70 ? "Strong foundation" : score >= 50 ? "Developing" : "Needs focus");
        if (previous.isEmpty()) {
            r.put("change", null);
            r.put("changeLabel", "First assessment recorded");
        } else {
            int delta = score - readinessScore(previous);
            r.put("change", delta);
            r.put("changeLabel", delta == 0 ? "No change since last assessment"
                    : (delta > 0 ? "Up " : "Down ") + Math.abs(delta) + "% since last assessment");
        }
        return r;
    }

    private List<Map<String, Object>> gaps(List<AssessmentScore> latest) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (AssessmentScore s : latest) {
            rows.add(Map.of("name", s.getTopic(),
                    "current", pct(s.getRightAnswers(), s.getTotalQuestions()),
                    "required", pct(s.getTargetAnswers(), s.getTotalQuestions())));
        }
        rows.sort(Comparator.comparingInt(row -> (int) row.get("current") - (int) row.get("required")));
        return rows;
    }

    private List<Map<String, Object>> assessmentRows(List<AssessmentScore> latest) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (AssessmentScore s : latest) {
            int current = pct(s.getRightAnswers(), s.getTotalQuestions());
            int required = pct(s.getTargetAnswers(), s.getTotalQuestions());
            int diff = current - required;
            String priority = diff >= 0 ? "Low" : s.getRightAnswers() == 0 ? "High" : "Medium";
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("code", code(s.getTopic()));
            row.put("name", s.getTopic());
            row.put("current", current);
            row.put("required", required);
            row.put("gap", (diff > 0 ? "+" : "") + diff + "%");
            row.put("priority", priority);
            rows.add(row);
        }
        return rows;
    }

    private String code(String topic) {
        String[] words = topic.trim().split("\\s+");
        if (words.length == 1) return topic.substring(0, Math.min(3, topic.length())).toUpperCase(Locale.ROOT);
        StringBuilder sb = new StringBuilder();
        for (String w : words) if (!w.isBlank() && sb.length() < 3 && Character.isLetter(w.charAt(0))) sb.append(Character.toUpperCase(w.charAt(0)));
        return sb.toString();
    }

    // ------------------------------------------------------------------ learning-derived

    private Map<String, Object> learningSummary(List<LearningEnrollment> courses) {
        int pending = 0, inProgress = 0, completed = 0, overdue = 0, progressSum = 0, completedThisMonth = 0;
        YearMonth now = YearMonth.now(ZoneOffset.UTC);
        for (LearningEnrollment c : courses) {
            String status = LearningProgressService.normalizeStatus(c.getStatus());
            progressSum += c.getProgressPercent();
            switch (status) {
                case LearningProgressService.COMPLETED -> {
                    completed++;
                    if (c.getCompletedAt() != null && YearMonth.from(c.getCompletedAt().atZone(ZoneOffset.UTC)).equals(now)) completedThisMonth++;
                }
                case LearningProgressService.IN_PROGRESS -> inProgress++;
                default -> pending++;
            }
            if (!LearningProgressService.COMPLETED.equals(status) && c.getDueDate() != null && c.getDueDate().isBefore(LocalDate.now())) overdue++;
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("total", courses.size());
        m.put("pending", pending);
        m.put("inProgress", inProgress);
        m.put("completed", completed);
        m.put("overdue", overdue);
        m.put("completedThisMonth", completedThisMonth);
        m.put("averageProgress", courses.isEmpty() ? 0 : Math.round(progressSum / (float) courses.size()));
        return m;
    }

    private List<Map<String, Object>> stats(List<AssessmentScore> latest, List<LearningEnrollment> courses) {
        long metTarget = latest.stream().filter(s -> s.getRightAnswers() >= s.getTargetAnswers()).count();
        long toImprove = latest.size() - metTarget;
        long high = latest.stream().filter(s -> s.getRightAnswers() < s.getTargetAnswers() && s.getRightAnswers() == 0).count();
        Map<String, Object> l = learningSummary(courses);

        List<Map<String, Object>> stats = new ArrayList<>();
        stats.add(stat("Skills assessed", String.valueOf(latest.size()),
                latest.isEmpty() ? "No assessment yet" : metTarget + " at target"));
        stats.add(stat("Skills to improve", String.valueOf(toImprove),
                latest.isEmpty() ? "Take the assessment" : high + " high priority"));
        stats.add(stat("Learning progress", courses.isEmpty() ? "—" : l.get("averageProgress") + "%",
                courses.isEmpty() ? "No courses assigned yet" : l.get("inProgress") + " in progress · " + l.get("pending") + " not started"));
        stats.add(stat("Completed trainings", String.valueOf(l.get("completed")),
                l.get("completedThisMonth") + " this month"));
        return stats;
    }

    private Map<String, Object> stat(String label, String value, String note) {
        return Map.of("label", label, "value", value, "note", note);
    }

    /** The one course the employee should work on next: overdue first, then furthest along. */
    private Map<String, Object> focus(List<LearningEnrollment> courses) {
        return courses.stream()
                .filter(c -> !LearningProgressService.COMPLETED.equals(LearningProgressService.normalizeStatus(c.getStatus())))
                .min(Comparator
                        .comparing((LearningEnrollment c) -> !(c.getDueDate() != null && c.getDueDate().isBefore(LocalDate.now())))
                        .thenComparing(c -> !LearningProgressService.IN_PROGRESS.equals(LearningProgressService.normalizeStatus(c.getStatus())))
                        .thenComparing(c -> c.getDueDate() == null ? LocalDate.MAX : c.getDueDate())
                        .thenComparing(LearningEnrollment::getUpdatedAt, Comparator.reverseOrder()))
                .map(learning::toView)
                .orElse(null);
    }

    // ------------------------------------------------------------------ who the employee works with

    private Map<String, Object> connections(User employee, List<LearningEnrollment> courses) {
        Map<String, Object> out = new LinkedHashMap<>();

        // Mentors: latest request per mentor, so ACCEPTED/PENDING/DECLINED is accurate.
        Map<String, MentorshipRequest> latestPerMentor = new LinkedHashMap<>();
        for (MentorshipRequest r : mentorshipRepository.findByEmployeeEmailIgnoreCaseOrderByCreatedAtDesc(employee.getEmail())) {
            latestPerMentor.putIfAbsent(r.getMentorEmail().toLowerCase(Locale.ROOT), r);
        }
        List<Map<String, Object>> mentors = new ArrayList<>();
        for (MentorshipRequest r : latestPerMentor.values()) {
            Map<String, Object> m = person(userRepository.findByEmailIgnoreCase(r.getMentorEmail()).orElse(null), r.getMentorEmail());
            m.put("status", r.getStatus());
            m.put("subjects", mentorAssignments.subjects(r.getMentorEmail(), employee.getEmail()));
            mentors.add(m);
        }
        out.put("mentors", mentors);

        // HR contact: whoever assigned the most recent HR-assigned course.
        courses.stream().map(LearningEnrollment::getAssignedBy)
                .filter(a -> a != null && !"SYSTEM".equals(a)).findFirst()
                .flatMap(userRepository::findByEmailIgnoreCase)
                .ifPresentOrElse(hr -> out.put("hr", person(hr, hr.getEmail())), () -> out.put("hr", null));

        // Department head of the employee's own department.
        String dept = employee.getDepartment();
        Optional<User> head = dept == null || dept.isBlank() ? Optional.empty()
                : userRepository.findByRole("ROLE_DEPARTMENT_HEAD").stream()
                        .filter(u -> u.getDepartment() != null && u.getDepartment().equalsIgnoreCase(dept))
                        .filter(u -> u.getStatus() == null || "APPROVED".equalsIgnoreCase(u.getStatus()))
                        .findFirst();
        out.put("departmentHead", head.map(h -> person(h, h.getEmail())).orElse(null));
        out.put("department", dept);
        return out;
    }

    /** Next scheduled sessions (including one in progress), with the Google Meet link. */
    private List<Map<String, Object>> upcomingSessions(User employee) {
        Map<String, User> byEmail = sessionService.usersByEmail();
        return sessionService.forEmployee(employee.getEmail()).stream()
                .filter(x -> "SCHEDULED".equals(x.getStatus()) && x.getScheduledAt()
                        .plus(java.time.Duration.ofMinutes(x.getDurationMinutes())).isAfter(Instant.now()))
                .limit(3)
                .map(x -> sessionService.view(x, byEmail))
                .toList();
    }

    private Map<String, Object> person(User user, String fallbackEmail) {
        Map<String, Object> p = new LinkedHashMap<>();
        String name = user == null ? "" : ((user.getFirstName() == null ? "" : user.getFirstName()) + " "
                + (user.getLastName() == null ? "" : user.getLastName())).trim();
        p.put("name", name.isBlank() ? fallbackEmail : name);
        p.put("email", user == null ? fallbackEmail : user.getEmail());
        return p;
    }

    private Map<String, Object> userSummary(User user) {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("email", user.getEmail());
        s.put("firstName", user.getFirstName());
        s.put("lastName", user.getLastName());
        s.put("role", user.getRole());
        s.put("department", user.getDepartment());
        return s;
    }
}
