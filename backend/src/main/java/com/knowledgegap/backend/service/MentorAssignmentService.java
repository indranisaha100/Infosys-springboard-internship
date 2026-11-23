package com.knowledgegap.backend.service;

import com.knowledgegap.backend.model.*;
import com.knowledgegap.backend.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;

/**
 * HR assigns an employee to a mentor for a subject. This is the single source of truth for
 * "who mentors whom". It keeps chat (ACCEPTED mentorship request), learning plans (mentorEmail
 * on enrollments) and notifications in step, so every dashboard shows the same relationship.
 */
@Service
public class MentorAssignmentService {
    private final MentorAssignmentRepository assignments;
    private final UserRepository users;
    private final MentorshipRequestRepository requests;
    private final LearningEnrollmentRepository enrollments;
    private final MentoringSessionRepository sessions;
    private final NotificationHelper notifier;
    private final ChatPushService push;

    public MentorAssignmentService(MentorAssignmentRepository assignments, UserRepository users,
            MentorshipRequestRepository requests, LearningEnrollmentRepository enrollments,
            MentoringSessionRepository sessions, NotificationHelper notifier, ChatPushService push) {
        this.assignments = assignments;
        this.users = users;
        this.requests = requests;
        this.enrollments = enrollments;
        this.sessions = sessions;
        this.notifier = notifier;
        this.push = push;
    }

    // ------------------------------------------------------------------ HR actions

    @Transactional
    public MentorAssignment assign(User hr, String employeeEmail, String mentorEmail, String subject, String notes) {
        if (blank(employeeEmail) || blank(mentorEmail) || blank(subject)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Employee, mentor and subject are all required.");
        }
        User employee = users.findByEmailIgnoreCase(employeeEmail.trim())
                .filter(u -> "ROLE_EMPLOYEE".equals(u.getRole()) && approved(u))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose an approved employee."));
        User mentor = users.findByEmailIgnoreCase(mentorEmail.trim())
                .filter(u -> "ROLE_MENTOR".equals(u.getRole()) && approved(u))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose an approved mentor."));
        String cleanSubject = subject.trim();

        if (assignments.findFirstByEmployeeEmailIgnoreCaseAndMentorEmailIgnoreCaseAndSubjectIgnoreCaseAndStatus(
                employee.getEmail(), mentor.getEmail(), cleanSubject, "ACTIVE").isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    NotificationHelper.displayName(employee) + " is already assigned to "
                            + NotificationHelper.displayName(mentor) + " for " + cleanSubject + ".");
        }

        MentorAssignment a = new MentorAssignment();
        a.setEmployeeEmail(employee.getEmail());
        a.setMentorEmail(mentor.getEmail());
        a.setSubject(cleanSubject);
        a.setNotes(blank(notes) ? null : notes.trim());
        a.setAssignedBy(hr == null ? "SYSTEM" : hr.getEmail());
        a = assignments.save(a);

        ensureAcceptedRequest(employee, mentor, cleanSubject);

        // Keep learning plans in step: unmatched courses for this subject now belong to this mentor.
        for (LearningEnrollment e : enrollments.findByEmployeeEmailIgnoreCaseOrderByUpdatedAtDesc(employee.getEmail())) {
            if (blank(e.getMentorEmail()) && e.getCompetency() != null && e.getCompetency().equalsIgnoreCase(cleanSubject)) {
                e.setMentorEmail(mentor.getEmail());
                enrollments.save(e);
            }
        }

        notifier.send(employee, "MENTOR_ASSIGNED", "A mentor was assigned to you",
                NotificationHelper.displayName(mentor) + " will mentor you in " + cleanSubject
                        + ". You can message them and book sessions from your workspace.");
        notifier.send(mentor, "MENTEE_ASSIGNED", "New mentee assigned",
                NotificationHelper.displayName(employee) + " was assigned to you for " + cleanSubject
                        + (a.getNotes() == null ? "." : ". Note from HR: " + a.getNotes()));
        push.refresh(employee.getEmail());
        push.refresh(mentor.getEmail());
        return a;
    }

    @Transactional
    public MentorAssignment end(Long id) {
        MentorAssignment current = assignments.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assignment not found."));
        if (!"ACTIVE".equals(current.getStatus())) return current;
        current.setStatus("ENDED");
        current.setEndedAt(Instant.now());
        final MentorAssignment a = assignments.save(current);

        // Close chat access only if no other ACTIVE assignment links the same pair.
        boolean stillLinked = assignments.findByMentorEmailIgnoreCaseAndStatus(a.getMentorEmail(), "ACTIVE").stream()
                .anyMatch(x -> x.getEmployeeEmail().equalsIgnoreCase(a.getEmployeeEmail()));
        if (!stillLinked) {
            for (MentorshipRequest r : requests.findByEmployeeEmailIgnoreCaseOrderByCreatedAtDesc(a.getEmployeeEmail())) {
                if (r.getMentorEmail().equalsIgnoreCase(a.getMentorEmail()) && "ACCEPTED".equals(r.getStatus())) {
                    r.setStatus("ENDED");
                    requests.save(r);
                }
            }
        }
        users.findByEmailIgnoreCase(a.getEmployeeEmail()).ifPresent(u -> notifier.send(u, "MENTOR_UNASSIGNED",
                "Mentor assignment ended", "Your " + a.getSubject() + " mentoring assignment has ended."));
        users.findByEmailIgnoreCase(a.getMentorEmail()).ifPresent(u -> notifier.send(u, "MENTEE_UNASSIGNED",
                "Mentee assignment ended", a.getEmployeeEmail() + " (" + a.getSubject() + ") is no longer assigned to you."));
        push.refresh(a.getEmployeeEmail());
        push.refresh(a.getMentorEmail());
        return a;
    }

    /** Reuses/upgrades any existing request so we never create duplicates for the same pair. */
    private void ensureAcceptedRequest(User employee, User mentor, String subject) {
        for (MentorshipRequest r : requests.findByEmployeeEmailIgnoreCaseOrderByCreatedAtDesc(employee.getEmail())) {
            if (r.getMentorEmail().equalsIgnoreCase(mentor.getEmail())) {
                if (!"ACCEPTED".equals(r.getStatus())) {
                    r.setStatus("ACCEPTED");
                    requests.save(r);
                }
                return;
            }
        }
        MentorshipRequest r = new MentorshipRequest();
        r.setEmployeeEmail(employee.getEmail());
        r.setMentorEmail(mentor.getEmail());
        r.setMessage("Assigned by HR for " + subject);
        r.setStatus("ACCEPTED");
        r.setCreatedAt(Instant.now());
        requests.save(r);
    }

    // ------------------------------------------------------------------ lookups used everywhere

    /** Mentees of a mentor (lower-case emails): active HR assignments + accepted self-requests. */
    public Set<String> menteeEmails(String mentorEmail) {
        Set<String> out = new LinkedHashSet<>();
        for (MentorAssignment a : assignments.findByMentorEmailIgnoreCaseAndStatus(mentorEmail, "ACTIVE")) {
            out.add(a.getEmployeeEmail().toLowerCase(Locale.ROOT));
        }
        for (MentorshipRequest r : requests.findByMentorEmailIgnoreCaseOrderByCreatedAtDesc(mentorEmail)) {
            if ("ACCEPTED".equalsIgnoreCase(r.getStatus())) out.add(r.getEmployeeEmail().toLowerCase(Locale.ROOT));
        }
        return out;
    }

    public boolean isMentee(String mentorEmail, String employeeEmail) {
        return employeeEmail != null && menteeEmails(mentorEmail).contains(employeeEmail.toLowerCase(Locale.ROOT));
    }

    public List<String> subjects(String mentorEmail, String employeeEmail) {
        return assignments.findByMentorEmailIgnoreCaseAndStatus(mentorEmail, "ACTIVE").stream()
                .filter(a -> a.getEmployeeEmail().equalsIgnoreCase(employeeEmail))
                .map(MentorAssignment::getSubject).distinct().toList();
    }

    public List<MentorAssignment> activeForEmployee(String employeeEmail) {
        return assignments.findByEmployeeEmailIgnoreCaseAndStatus(employeeEmail, "ACTIVE");
    }

    // ------------------------------------------------------------------ HR table

    @Transactional(readOnly = true)
    public List<Map<String, Object>> hrView() {
        Map<String, User> byEmail = new HashMap<>();
        for (User u : users.findAll()) byEmail.put(u.getEmail().toLowerCase(Locale.ROOT), u);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (MentorAssignment a : assignments.findAllByOrderByCreatedAtDesc()) {
            User employee = byEmail.get(a.getEmployeeEmail().toLowerCase(Locale.ROOT));
            User mentor = byEmail.get(a.getMentorEmail().toLowerCase(Locale.ROOT));

            List<LearningEnrollment> courses = enrollments
                    .findByEmployeeEmailIgnoreCaseOrderByUpdatedAtDesc(a.getEmployeeEmail()).stream()
                    .filter(e -> (e.getCompetency() != null && e.getCompetency().equalsIgnoreCase(a.getSubject()))
                            || a.getMentorEmail().equalsIgnoreCase(e.getMentorEmail()))
                    .toList();
            long done = courses.stream().filter(e -> LearningProgressService.COMPLETED
                    .equals(LearningProgressService.normalizeStatus(e.getStatus()))).count();
            int avg = courses.isEmpty() ? 0 : (int) Math.round(courses.stream()
                    .mapToInt(LearningEnrollment::getProgressPercent).average().orElse(0));

            List<MentoringSession> pair = sessions.findByMentorEmailIgnoreCaseOrderByScheduledAtAsc(a.getMentorEmail())
                    .stream().filter(s -> s.getEmployeeEmail().equalsIgnoreCase(a.getEmployeeEmail())).toList();
            long upcoming = pair.stream().filter(s -> "SCHEDULED".equals(s.getStatus())
                    && s.getScheduledAt().isAfter(Instant.now())).count();
            long held = pair.stream().filter(s -> "COMPLETED".equals(s.getStatus())).count();

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", a.getId());
            row.put("employeeEmail", a.getEmployeeEmail());
            row.put("employeeName", employee == null ? a.getEmployeeEmail() : NotificationHelper.displayName(employee));
            row.put("mentorEmail", a.getMentorEmail());
            row.put("mentorName", mentor == null ? a.getMentorEmail() : NotificationHelper.displayName(mentor));
            row.put("subject", a.getSubject());
            row.put("notes", a.getNotes());
            row.put("status", a.getStatus());
            row.put("assignedBy", a.getAssignedBy());
            row.put("createdAt", a.getCreatedAt());
            row.put("endedAt", a.getEndedAt());
            row.put("courses", Map.of("total", courses.size(), "completed", done, "averageProgress", avg));
            row.put("sessions", Map.of("upcoming", upcoming, "completed", held));
            rows.add(row);
        }
        return rows;
    }

    private boolean approved(User u) {
        return u.getStatus() == null || "APPROVED".equalsIgnoreCase(u.getStatus());
    }

    private boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
