package com.knowledgegap.backend.service;

import com.knowledgegap.backend.model.MentoringSession;
import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.MentoringSessionRepository;
import com.knowledgegap.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Mentor <-> mentee sessions with a Google Meet link.
 * The mentor creates a meeting at meet.google.com/new (or from Google Calendar) and pastes the
 * link; we validate that it really is a Meet URL, store it and notify the employee.
 * (Auto-creating Meet links needs the Google Calendar API + OAuth - see README for the upgrade path.)
 */
@Service
public class MentoringSessionService {
    private static final Pattern MEET_LINK =
            Pattern.compile("^https://meet\\.google\\.com/[A-Za-z0-9_\\-/?=&.%]{3,200}$");
    private static final Set<String> STATUSES = Set.of("SCHEDULED", "COMPLETED", "CANCELLED");

    private final MentoringSessionRepository sessions;
    private final UserRepository users;
    private final MentorAssignmentService assignments;
    private final NotificationHelper notifier;
    private final ChatPushService push;

    public MentoringSessionService(MentoringSessionRepository sessions, UserRepository users,
            MentorAssignmentService assignments, NotificationHelper notifier, ChatPushService push) {
        this.sessions = sessions;
        this.users = users;
        this.assignments = assignments;
        this.notifier = notifier;
        this.push = push;
    }

    public record NewSession(String employeeEmail, String title, String subject, String agenda,
            Instant scheduledAt, Integer durationMinutes, String meetLink) {}

    // ------------------------------------------------------------------ mentor

    @Transactional
    public MentoringSession schedule(User mentor, NewSession in) {
        if (in.employeeEmail() == null || !assignments.isMentee(mentor.getEmail(), in.employeeEmail())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You can only schedule sessions with employees assigned to you.");
        }
        User employee = users.findByEmailIgnoreCase(in.employeeEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Employee not found."));
        if (in.title() == null || in.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A session title is required.");
        }
        if (in.scheduledAt() == null || in.scheduledAt().isBefore(Instant.now().minus(Duration.ofMinutes(5)))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a date and time in the future.");
        }
        int duration = in.durationMinutes() == null ? 30 : in.durationMinutes();
        if (duration < 15 || duration > 240) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duration must be between 15 and 240 minutes.");
        }
        MentoringSession s = new MentoringSession();
        s.setMentorEmail(mentor.getEmail());
        s.setEmployeeEmail(employee.getEmail());
        s.setTitle(in.title().trim());
        s.setSubject(blank(in.subject()) ? null : in.subject().trim());
        s.setAgenda(blank(in.agenda()) ? null : cut(in.agenda().trim(), 2000));
        s.setScheduledAt(in.scheduledAt());
        s.setDurationMinutes(duration);
        s.setMeetLink(cleanLink(in.meetLink()));
        s = sessions.save(s);

        notifier.send(employee, "SESSION_SCHEDULED", "Mentoring session scheduled",
                NotificationHelper.displayName(mentor) + " scheduled \"" + s.getTitle() + "\" for " + s.getScheduledAt()
                        + " (UTC, " + duration + " min). "
                        + (s.getMeetLink() == null ? "The Google Meet link will be added shortly." : "Join: " + s.getMeetLink()));
        push.refresh(employee.getEmail());
        return s;
    }

    /** Partial update by the owning mentor. Only keys present in {@code changes} are touched. */
    @Transactional
    public MentoringSession update(User mentor, Long id, Map<String, Object> changes) {
        MentoringSession s = sessions.findById(id)
                .filter(x -> x.getMentorEmail().equalsIgnoreCase(mentor.getEmail()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found."));

        String before = s.getStatus();
        Instant timeBefore = s.getScheduledAt();
        String linkBefore = s.getMeetLink();

        if (changes.containsKey("title") && !blank(str(changes.get("title")))) s.setTitle(str(changes.get("title")).trim());
        if (changes.containsKey("agenda")) s.setAgenda(blank(str(changes.get("agenda"))) ? null : cut(str(changes.get("agenda")).trim(), 2000));
        if (changes.containsKey("meetLink")) s.setMeetLink(cleanLink(str(changes.get("meetLink"))));
        if (changes.containsKey("mentorNotes")) s.setMentorNotes(blank(str(changes.get("mentorNotes"))) ? null : cut(str(changes.get("mentorNotes")).trim(), 4000));
        if (changes.get("durationMinutes") instanceof Number n) {
            if (n.intValue() < 15 || n.intValue() > 240) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duration must be between 15 and 240 minutes.");
            }
            s.setDurationMinutes(n.intValue());
        }
        if (changes.containsKey("scheduledAt") && !blank(str(changes.get("scheduledAt")))) {
            try {
                s.setScheduledAt(Instant.parse(str(changes.get("scheduledAt"))));
            } catch (RuntimeException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date/time.");
            }
        }
        if (changes.containsKey("status")) {
            String status = str(changes.get("status")).toUpperCase(Locale.ROOT);
            if (!STATUSES.contains(status)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status must be SCHEDULED, COMPLETED or CANCELLED.");
            }
            s.setStatus(status);
        }
        s.setUpdatedAt(Instant.now());
        s = sessions.save(s);

        final MentoringSession saved = s;
        users.findByEmailIgnoreCase(s.getEmployeeEmail()).ifPresent(employee -> {
            if ("CANCELLED".equals(saved.getStatus()) && !"CANCELLED".equals(before)) {
                notifier.send(employee, "SESSION_CANCELLED", "Mentoring session cancelled",
                        "\"" + saved.getTitle() + "\" planned for " + saved.getScheduledAt() + " was cancelled.");
            } else if ("COMPLETED".equals(saved.getStatus()) && !"COMPLETED".equals(before)) {
                notifier.send(employee, "SESSION_COMPLETED", "Mentoring session completed",
                        "\"" + saved.getTitle() + "\" was marked completed. You can leave feedback in Mentoring Sessions.");
            } else if (!saved.getScheduledAt().equals(timeBefore) || !Objects.equals(saved.getMeetLink(), linkBefore)) {
                notifier.send(employee, "SESSION_UPDATED", "Mentoring session updated",
                        "\"" + saved.getTitle() + "\" is now " + saved.getScheduledAt() + " (UTC). "
                                + (saved.getMeetLink() == null ? "" : "Join: " + saved.getMeetLink()));
            }
            push.refresh(employee.getEmail());
        });
        return saved;
    }

    // ------------------------------------------------------------------ employee

    @Transactional
    public MentoringSession leaveFeedback(User employee, Long id, int rating, String comment) {
        if (rating < 1 || rating > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rating must be from 1 to 5.");
        }
        MentoringSession s = sessions.findById(id)
                .filter(x -> x.getEmployeeEmail().equalsIgnoreCase(employee.getEmail()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found."));
        if (!"COMPLETED".equals(s.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Feedback opens after the mentor completes the session.");
        }
        s.setEmployeeRating(rating);
        s.setEmployeeFeedback(blank(comment) ? null : cut(comment.trim(), 1000));
        s.setUpdatedAt(Instant.now());
        s = sessions.save(s);
        final MentoringSession saved = s;
        users.findByEmailIgnoreCase(s.getMentorEmail()).ifPresent(mentor -> notifier.send(mentor, "SESSION_FEEDBACK",
                "Session feedback received", NotificationHelper.displayName(employee) + " rated \"" + saved.getTitle()
                        + "\" " + rating + "/5."));
        return s;
    }

    // ------------------------------------------------------------------ queries / views

    public List<MentoringSession> forMentor(String email) {
        return sessions.findByMentorEmailIgnoreCaseOrderByScheduledAtAsc(email);
    }

    public List<MentoringSession> forEmployee(String email) {
        return sessions.findByEmployeeEmailIgnoreCaseOrderByScheduledAtAsc(email);
    }

    public Map<String, Object> view(MentoringSession s, Map<String, User> byEmail) {
        User mentor = byEmail.get(s.getMentorEmail().toLowerCase(Locale.ROOT));
        User employee = byEmail.get(s.getEmployeeEmail().toLowerCase(Locale.ROOT));
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("title", s.getTitle());
        m.put("subject", s.getSubject());
        m.put("agenda", s.getAgenda());
        m.put("scheduledAt", s.getScheduledAt());
        m.put("endsAt", s.getScheduledAt().plus(Duration.ofMinutes(s.getDurationMinutes())));
        m.put("durationMinutes", s.getDurationMinutes());
        m.put("meetLink", s.getMeetLink());
        m.put("status", s.getStatus());
        m.put("mentorEmail", s.getMentorEmail());
        m.put("mentorName", mentor == null ? s.getMentorEmail() : NotificationHelper.displayName(mentor));
        m.put("employeeEmail", s.getEmployeeEmail());
        m.put("employeeName", employee == null ? s.getEmployeeEmail() : NotificationHelper.displayName(employee));
        m.put("mentorNotes", s.getMentorNotes());
        m.put("employeeRating", s.getEmployeeRating());
        m.put("employeeFeedback", s.getEmployeeFeedback());
        return m;
    }

    public Map<String, User> usersByEmail() {
        Map<String, User> map = new HashMap<>();
        for (User u : users.findAll()) map.put(u.getEmail().toLowerCase(Locale.ROOT), u);
        return map;
    }

    // ------------------------------------------------------------------ helpers

    private String cleanLink(String link) {
        if (blank(link)) return null;
        String trimmed = link.trim();
        if (!MEET_LINK.matcher(trimmed).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Enter a Google Meet link like https://meet.google.com/abc-defg-hij.");
        }
        return trimmed;
    }

    private String str(Object o) {
        return o == null ? "" : String.valueOf(o);
    }

    private String cut(String s, int max) {
        return s.length() > max ? s.substring(0, max) : s;
    }

    private boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
