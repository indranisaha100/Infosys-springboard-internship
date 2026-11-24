package com.knowledgegap.backend.service;

import com.knowledgegap.backend.model.*;
import com.knowledgegap.backend.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

/**
 * Mentor dashboard built only from the mentor's real mentees (HR assignments + accepted requests):
 * their assessments, their learning enrollments and the sessions the mentor scheduled.
 */
@Service
public class MentorDashboardService {
    private final MentorAssignmentService assignments;
    private final UserRepository users;
    private final AssessmentScoreRepository scoreRepository;
    private final LearningEnrollmentRepository enrollmentRepository;
    private final LearningResourceRepository resourceRepository;
    private final MentoringSessionService sessionService;
    private final LearningProgressService learning;

    public MentorDashboardService(MentorAssignmentService assignments, UserRepository users,
            AssessmentScoreRepository scoreRepository, LearningEnrollmentRepository enrollmentRepository,
            LearningResourceRepository resourceRepository, MentoringSessionService sessionService,
            LearningProgressService learning) {
        this.assignments = assignments;
        this.users = users;
        this.scoreRepository = scoreRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.resourceRepository = resourceRepository;
        this.sessionService = sessionService;
        this.learning = learning;
    }

    /** Everything we know about one mentee. */
    private record Mentee(User user, List<AssessmentScore> latest, List<AssessmentScore> previous,
            List<LearningEnrollment> courses, List<String> subjects) {}

    // ------------------------------------------------------------------ loading

    private List<Mentee> loadMentees(User mentor) {
        Set<String> emails = assignments.menteeEmails(mentor.getEmail());
        if (emails.isEmpty()) return List.of();

        Map<String, List<AssessmentScore>> scoresByEmployee = new HashMap<>();
        for (AssessmentScore s : scoreRepository.findAllByOrderBySubmittedAtDesc()) {
            String key = s.getEmployeeEmail().toLowerCase(Locale.ROOT);
            if (emails.contains(key)) scoresByEmployee.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
        }
        Map<String, List<LearningEnrollment>> coursesByEmployee = new HashMap<>();
        for (LearningEnrollment e : enrollmentRepository.findAllByOrderByUpdatedAtDesc()) {
            String key = e.getEmployeeEmail().toLowerCase(Locale.ROOT);
            if (emails.contains(key)) coursesByEmployee.computeIfAbsent(key, k -> new ArrayList<>()).add(e);
        }

        List<Mentee> result = new ArrayList<>();
        for (String email : emails) {
            Optional<User> user = users.findByEmailIgnoreCase(email).filter(u -> "ROLE_EMPLOYEE".equals(u.getRole()));
            if (user.isEmpty()) continue;
            List<AssessmentScore> all = scoresByEmployee.getOrDefault(email, List.of());
            Map<Instant, List<AssessmentScore>> bySubmission = new LinkedHashMap<>();
            for (AssessmentScore s : all) bySubmission.computeIfAbsent(s.getSubmittedAt(), k -> new ArrayList<>()).add(s);
            List<List<AssessmentScore>> subs = new ArrayList<>(bySubmission.values());
            result.add(new Mentee(user.get(),
                    subs.isEmpty() ? List.of() : subs.get(0),
                    subs.size() > 1 ? subs.get(1) : List.of(),
                    coursesByEmployee.getOrDefault(email, List.of()),
                    assignments.subjects(mentor.getEmail(), email)));
        }
        result.sort(Comparator.comparing(m -> NotificationHelper.displayName(m.user()).toLowerCase(Locale.ROOT)));
        return result;
    }

    // ------------------------------------------------------------------ dashboard

    @Transactional(readOnly = true)
    public Map<String, Object> build(User mentor) {
        List<Mentee> mentees = loadMentees(mentor);
        Map<String, User> byEmail = sessionService.usersByEmail();
        List<MentoringSession> allSessions = sessionService.forMentor(mentor.getEmail());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("mentor", Map.of("name", NotificationHelper.displayName(mentor), "email", mentor.getEmail()));
        out.put("menteeCount", mentees.size());
        out.put("stats", stats(mentees, allSessions));
        out.put("mentees", mentees.stream().map(this::menteeRow).toList());
        out.put("gaps", teamAssessmentSummary(mentees));
        out.put("heatmapColumns", mentees.stream().limit(8).map(m -> Map.of(
                "label", initials(m.user()), "name", NotificationHelper.displayName(m.user()))).toList());
        out.put("heatmap", heatmap(mentees));
        out.put("learningProgress", learningBuckets(mentees));
        out.put("recommendations", recommendations(mentees));
        out.put("sessions", upcoming(allSessions, byEmail));
        out.put("activity", activity(mentees, allSessions, byEmail));
        out.put("assessments", assessmentRows(mentees));
        out.put("impact", impact(mentees));
        return out;
    }

    private List<Map<String, Object>> stats(List<Mentee> mentees, List<MentoringSession> sessions) {
        long withGaps = mentees.stream().filter(m -> !gapTopics(m).isEmpty()).count();
        long critical = mentees.stream().flatMap(m -> m.latest().stream()).filter(s -> s.getRightAnswers() == 0).count();
        List<LearningEnrollment> courses = mentees.stream().flatMap(m -> m.courses().stream()).toList();
        long completed = courses.stream().filter(c -> LearningProgressService.COMPLETED.equals(LearningProgressService.normalizeStatus(c.getStatus()))).count();
        long inProgress = courses.stream().filter(c -> LearningProgressService.IN_PROGRESS.equals(LearningProgressService.normalizeStatus(c.getStatus()))).count();
        int avg = courses.isEmpty() ? 0 : (int) Math.round(courses.stream().mapToInt(LearningEnrollment::getProgressPercent).average().orElse(0));
        List<MentoringSession> upcoming = sessions.stream().filter(this::isUpcoming).toList();

        return List.of(
                stat("Total Mentees", mentees.size(), mentees.isEmpty() ? "None assigned yet - HR assigns mentees" : "Assigned by HR or accepted by you", "users", "blue"),
                stat("Mentees with Skill Gaps", withGaps, critical + " critical topic(s) at 0 correct", "gap", "amber"),
                stat("Learning Progress", courses.isEmpty() ? "—" : avg + "%", courses.isEmpty() ? "No courses assigned yet" : completed + " completed · " + inProgress + " in progress", "book", "purple"),
                stat("Upcoming Sessions", upcoming.size(), upcoming.isEmpty() ? "Nothing scheduled" : "Next: " + upcoming.get(0).getScheduledAt(), "calendar", "green"));
    }

    private Map<String, Object> stat(String label, Object value, String note, String icon, String tone) {
        return Map.of("label", label, "value", value, "note", note, "icon", icon, "tone", tone);
    }

    // ------------------------------------------------------------------ per mentee

    private int pct(int part, int total) {
        return total <= 0 ? 0 : Math.round(part * 100f / total);
    }

    private record TopicGap(String topic, int current, int required, int gap, boolean critical) {}

    private List<TopicGap> gapTopics(Mentee m) {
        List<TopicGap> gaps = new ArrayList<>();
        for (AssessmentScore s : m.latest()) {
            int current = pct(s.getRightAnswers(), s.getTotalQuestions());
            int required = pct(s.getTargetAnswers(), s.getTotalQuestions());
            if (current < required) gaps.add(new TopicGap(s.getTopic(), current, required, required - current, s.getRightAnswers() == 0));
        }
        gaps.sort(Comparator.comparingInt(TopicGap::gap).reversed());
        return gaps;
    }

    private int averageProgress(Mentee m) {
        return m.courses().isEmpty() ? 0 : (int) Math.round(m.courses().stream().mapToInt(LearningEnrollment::getProgressPercent).average().orElse(0));
    }

    private String statusOf(Mentee m) {
        boolean allDone = !m.courses().isEmpty() && m.courses().stream().allMatch(c ->
                LearningProgressService.COMPLETED.equals(LearningProgressService.normalizeStatus(c.getStatus())));
        if (allDone) return "Completed";
        boolean overdue = m.courses().stream().anyMatch(c -> c.getDueDate() != null && c.getDueDate().isBefore(LocalDate.now())
                && !LearningProgressService.COMPLETED.equals(LearningProgressService.normalizeStatus(c.getStatus())));
        boolean notAssessed = m.latest().isEmpty();
        boolean gapsButNoStart = !gapTopics(m).isEmpty() && m.courses().stream().noneMatch(c -> c.getProgressPercent() > 0);
        return overdue || notAssessed || gapsButNoStart ? "Needs Attention" : "On Track";
    }

    private Map<String, Object> menteeRow(Mentee m) {
        List<TopicGap> gaps = gapTopics(m);
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("name", NotificationHelper.displayName(m.user()));
        row.put("initials", initials(m.user()));
        row.put("email", m.user().getEmail());
        row.put("department", blank(m.user().getDepartment()) ? "Unassigned" : m.user().getDepartment());
        row.put("subjects", m.subjects());
        row.put("skill", !m.subjects().isEmpty() ? String.join(", ", m.subjects()) : gaps.isEmpty() ? "—" : gaps.get(0).topic());
        row.put("gap", m.latest().isEmpty() ? "Assessment pending"
                : gaps.isEmpty() ? "No gaps - at target" : gaps.get(0).topic() + " (-" + gaps.get(0).gap() + "%)");
        row.put("progress", averageProgress(m));
        row.put("courses", m.courses().size());
        row.put("status", statusOf(m));
        return row;
    }

    // ------------------------------------------------------------------ team aggregates

    private List<Map<String, Object>> teamAssessmentSummary(List<Mentee> mentees) {
        Map<String, List<AssessmentScore>> scoresByTopic = new LinkedHashMap<>();
        for (Mentee m : mentees) {
            for (AssessmentScore s : m.latest()) {
                scoresByTopic.computeIfAbsent(s.getTopic(), k -> new ArrayList<>()).add(s);
            }
        }
        List<Map<String, Object>> rows = new ArrayList<>();
        scoresByTopic.forEach((topic, scores) -> {
            int current = (int) Math.round(scores.stream()
                    .mapToInt(s -> pct(s.getRightAnswers(), s.getTotalQuestions())).average().orElse(0));
            int target = (int) Math.round(scores.stream()
                    .mapToInt(s -> pct(s.getTargetAnswers(), s.getTotalQuestions())).average().orElse(0));
            rows.add(Map.of("name", topic, "value", current, "target", target,
                    "gap", Math.max(target - current, 0)));
        });
        rows.sort((a, b) -> Integer.compare((int) b.get("gap"), (int) a.get("gap")));
        return rows;
    }

    private List<Map<String, Object>> heatmap(List<Mentee> mentees) {
        List<Mentee> shown = mentees.stream().limit(8).toList();
        Set<String> topics = new TreeSet<>();
        shown.forEach(m -> m.latest().forEach(s -> topics.add(s.getTopic())));
        List<Map<String, Object>> rows = new ArrayList<>();
        for (String topic : topics) {
            List<Integer> values = new ArrayList<>();
            for (Mentee m : shown) {
                values.add(m.latest().stream().filter(s -> s.getTopic().equals(topic)).findFirst()
                        .map(s -> pct(s.getRightAnswers(), s.getTotalQuestions())).orElse(null));
            }
            rows.add(Map.of("skill", topic, "values", values));
        }
        return rows;
    }

    private List<Map<String, Object>> learningBuckets(List<Mentee> mentees) {
        int pending = 0, inProgress = 0, completed = 0;
        for (Mentee m : mentees) {
            for (LearningEnrollment c : m.courses()) {
                switch (LearningProgressService.normalizeStatus(c.getStatus())) {
                    case LearningProgressService.COMPLETED -> completed++;
                    case LearningProgressService.IN_PROGRESS -> inProgress++;
                    default -> pending++;
                }
            }
        }
        return List.of(
                Map.of("title", "Not Started", "count", pending, "color", "bg-slate-200"),
                Map.of("title", "In Progress", "count", inProgress, "color", "bg-blue-500"),
                Map.of("title", "Completed", "count", completed, "color", "bg-emerald-500"));
    }

    private List<Map<String, Object>> assessmentRows(List<Mentee> mentees) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Mentee m : mentees) {
            if (m.latest().isEmpty()) continue;
            int score = overall(m.latest());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("name", NotificationHelper.displayName(m.user()));
            row.put("email", m.user().getEmail());
            row.put("score", score);
            if (m.previous().isEmpty()) {
                row.put("change", "First");
            } else {
                int delta = score - overall(m.previous());
                row.put("change", (delta > 0 ? "+" : "") + delta + "%");
            }
            row.put("submittedAt", m.latest().get(0).getSubmittedAt());
            rows.add(row);
        }
        return rows;
    }

    private int overall(List<AssessmentScore> scores) {
        int right = scores.stream().mapToInt(AssessmentScore::getRightAnswers).sum();
        int total = scores.stream().mapToInt(AssessmentScore::getTotalQuestions).sum();
        return pct(right, total);
    }

    private Map<String, Object> impact(List<Mentee> mentees) {
        List<Mentee> assessed = mentees.stream().filter(m -> !m.latest().isEmpty()).toList();
        Map<String, Object> out = new LinkedHashMap<>();
        if (assessed.isEmpty()) {
            out.put("value", null);
            out.put("note", "Readiness appears once your mentees submit a skill assessment.");
            return out;
        }
        double avg = assessed.stream().mapToDouble(m -> m.latest().stream()
                .mapToDouble(s -> s.getTargetAnswers() <= 0 ? 100 : Math.min(100.0, s.getRightAnswers() * 100.0 / s.getTargetAnswers()))
                .average().orElse(0)).average().orElse(0);
        long attention = mentees.stream().filter(m -> "Needs Attention".equals(statusOf(m))).count();
        out.put("value", (int) Math.round(avg));
        out.put("note", attention == 0 ? "All mentees are on track."
                : attention + " mentee(s) need attention - check overdue courses and unstarted plans.");
        return out;
    }

    // ------------------------------------------------------------------ recommendations / sessions / activity

    private List<Map<String, Object>> recommendations(List<Mentee> mentees) {
        Map<String, Integer> weak = new LinkedHashMap<>();
        for (Mentee m : mentees) for (TopicGap g : gapTopics(m)) weak.merge(g.topic(), g.gap(), Integer::sum);
        List<String> weakTopics = weak.entrySet().stream().sorted((a, b) -> b.getValue() - a.getValue()).map(Map.Entry::getKey).toList();

        List<LearningResource> resources = resourceRepository.findByActiveTrueOrderByTitleAsc();
        List<LearningResource> picked = new ArrayList<>();
        for (String topic : weakTopics) {
            String t = topic.toLowerCase(Locale.ROOT);
            for (LearningResource r : resources) {
                if (!picked.contains(r) && (has(r.getCompetency(), t) || has(r.getCategory(), t) || has(r.getTitle(), t))) picked.add(r);
            }
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (LearningResource r : picked.stream().limit(6).toList()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getId());
            m.put("title", r.getTitle());
            m.put("category", r.getCategory());
            m.put("competency", r.getCompetency() == null ? r.getCategory() : r.getCompetency());
            m.put("difficulty", blank(r.getDifficulty()) ? "All levels" : r.getDifficulty());
            m.put("duration", r.getDurationMinutes() == null ? "Self-paced" : r.getDurationMinutes() + " min");
            m.put("icon", icon(r));
            out.add(m);
        }
        return out;
    }

    private String icon(LearningResource r) {
        String c = ((r.getCategory() == null ? "" : r.getCategory()) + " " + (r.getCompetency() == null ? "" : r.getCompetency())).toLowerCase(Locale.ROOT);
        if (c.contains("sql") || c.contains("data")) return "database";
        if (c.contains("react") || c.contains("front")) return "layers";
        if (c.contains("java") || c.contains("code") || c.contains("api")) return "code";
        return "chart";
    }

    private boolean isUpcoming(MentoringSession s) {
        return "SCHEDULED".equals(s.getStatus())
                && s.getScheduledAt().plus(Duration.ofMinutes(s.getDurationMinutes())).isAfter(Instant.now());
    }

    private List<Map<String, Object>> upcoming(List<MentoringSession> all, Map<String, User> byEmail) {
        return all.stream().filter(this::isUpcoming).limit(5).map(s -> sessionService.view(s, byEmail)).toList();
    }

    private List<Map<String, Object>> activity(List<Mentee> mentees, List<MentoringSession> sessions, Map<String, User> byEmail) {
        record Event(Instant at, String text, String icon) {}
        List<Event> events = new ArrayList<>();
        for (Mentee m : mentees) {
            String name = NotificationHelper.displayName(m.user());
            if (!m.latest().isEmpty()) events.add(new Event(m.latest().get(0).getSubmittedAt(), name + " submitted a skill assessment (" + overall(m.latest()) + "%).", "check"));
            for (LearningEnrollment c : m.courses()) {
                String status = LearningProgressService.normalizeStatus(c.getStatus());
                if (LearningProgressService.COMPLETED.equals(status)) {
                    events.add(new Event(c.getCompletedAt() != null ? c.getCompletedAt() : c.getUpdatedAt(), name + " completed \"" + c.getLearningTitle() + "\".", "book"));
                } else if (c.getProgressPercent() > 0) {
                    events.add(new Event(c.getUpdatedAt(), name + " is " + c.getProgressPercent() + "% through \"" + c.getLearningTitle() + "\".", "chart"));
                } else {
                    events.add(new Event(c.getAssignedAt() != null ? c.getAssignedAt() : c.getUpdatedAt(), "\"" + c.getLearningTitle() + "\" was assigned to " + name + ".", "book"));
                }
            }
        }
        for (MentoringSession s : sessions) {
            User e = byEmail.get(s.getEmployeeEmail().toLowerCase(Locale.ROOT));
            String name = e == null ? s.getEmployeeEmail() : NotificationHelper.displayName(e);
            if ("COMPLETED".equals(s.getStatus())) events.add(new Event(s.getUpdatedAt(), "Session \"" + s.getTitle() + "\" with " + name + " was completed.", "calendar"));
            if (s.getEmployeeRating() != null) events.add(new Event(s.getUpdatedAt(), name + " rated \"" + s.getTitle() + "\" " + s.getEmployeeRating() + "/5.", "check"));
        }
        events.sort((a, b) -> b.at().compareTo(a.at()));
        return events.stream().limit(8).map(e -> Map.<String, Object>of("text", e.text(), "at", e.at(), "icon", e.icon())).toList();
    }

    // ------------------------------------------------------------------ mentee list + detail

    @Transactional(readOnly = true)
    public List<Map<String, Object>> menteeList(User mentor) {
        return loadMentees(mentor).stream().map(this::menteeRow).toList();
    }

    /** Learning rows for the "Learning Progress" page: one row per mentee course. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> learningRows(User mentor) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Mentee m : loadMentees(mentor)) {
            for (LearningEnrollment c : m.courses()) {
                Map<String, Object> row = new LinkedHashMap<>(learning.toView(c));
                row.put("employeeEmail", m.user().getEmail());
                row.put("employeeName", NotificationHelper.displayName(m.user()));
                rows.add(row);
            }
        }
        return rows;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> menteeDetail(User mentor, String email) {
        if (!assignments.isMentee(mentor.getEmail(), email)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This employee is not assigned to you.");
        }
        Mentee m = loadMentees(mentor).stream().filter(x -> x.user().getEmail().equalsIgnoreCase(email)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mentee not found."));
        Map<String, User> byEmail = sessionService.usersByEmail();

        Map<String, Object> out = new LinkedHashMap<>(menteeRow(m));
        out.put("skillsAssessed", m.latest().stream().map(s -> Map.<String, Object>of(
                "topic", s.getTopic(),
                "current", pct(s.getRightAnswers(), s.getTotalQuestions()),
                "required", pct(s.getTargetAnswers(), s.getTotalQuestions()))).toList());
        out.put("courseList", m.courses().stream().map(learning::toView).toList());
        out.put("sessionList", sessionService.forMentor(mentor.getEmail()).stream()
                .filter(s -> s.getEmployeeEmail().equalsIgnoreCase(email))
                .map(s -> sessionService.view(s, byEmail)).toList());
        return out;
    }

    // ------------------------------------------------------------------ helpers

    private String initials(User user) {
        String name = NotificationHelper.displayName(user);
        String[] parts = name.split("\\s+");
        return parts.length > 1 ? (parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1)).toUpperCase()
                : name.substring(0, Math.min(2, name.length())).toUpperCase();
    }

    private boolean has(String value, String target) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(target);
    }

    private boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
