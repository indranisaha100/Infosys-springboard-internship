package com.knowledgegap.backend.service;

import com.knowledgegap.backend.model.GeneratedSkillProgram;
import com.knowledgegap.backend.model.HrNotification;
import com.knowledgegap.backend.model.LearningEnrollment;
import com.knowledgegap.backend.model.MentorshipRequest;
import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.GeneratedSkillProgramRepository;
import com.knowledgegap.backend.repository.HrNotificationRepository;
import com.knowledgegap.backend.repository.LearningEnrollmentRepository;
import com.knowledgegap.backend.repository.MentorshipRequestRepository;
import com.knowledgegap.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Single place that creates and changes learning enrollments, so HR, employee, mentor and
 * department-head dashboards can never disagree about status or progress.
 */
@Service
public class LearningProgressService {
    public static final String PENDING = "PENDING";
    public static final String IN_PROGRESS = "IN_PROGRESS";
    public static final String COMPLETED = "COMPLETED";

    private final LearningEnrollmentRepository enrollments;
    private final UserRepository users;
    private final HrNotificationRepository notifications;
    private final MentorshipRequestRepository mentorshipRequests;
    private final GeneratedSkillProgramRepository programs;

    public LearningProgressService(LearningEnrollmentRepository enrollments, UserRepository users,
            HrNotificationRepository notifications, MentorshipRequestRepository mentorshipRequests,
            GeneratedSkillProgramRepository programs) {
        this.enrollments = enrollments;
        this.users = users;
        this.notifications = notifications;
        this.mentorshipRequests = mentorshipRequests;
        this.programs = programs;
    }

    /** What HR (or the skill-gap generator) sends when it assigns a course. */
    public record AssignCommand(String employeeEmail, String learningTitle, String mentorEmail,
            String competency, Long resourceId, LocalDate dueDate, String source) {}

    // ------------------------------------------------------------------ status rules

    /** Maps any legacy/free-text status ("In Progress", "done"...) onto the 3 valid ones. */
    public static String normalizeStatus(String raw) {
        if (raw == null || raw.isBlank()) return PENDING;
        String value = raw.trim().toUpperCase(Locale.ROOT).replace(' ', '_').replace('-', '_');
        if (value.startsWith("COMPLET") || value.equals("DONE") || value.equals("FINISHED")) return COMPLETED;
        if (value.startsWith("IN_PROG") || value.equals("STARTED") || value.equals("ACTIVE")) return IN_PROGRESS;
        return PENDING;
    }

    /** Status is derived from progress, never typed in by hand. */
    public static String statusFor(int progressPercent) {
        if (progressPercent >= 100) return COMPLETED;
        if (progressPercent > 0) return IN_PROGRESS;
        return PENDING;
    }

    // ------------------------------------------------------------------ HR assigns

    @Transactional
    public LearningEnrollment assign(User assigner, AssignCommand cmd) {
        if (cmd.employeeEmail() == null || cmd.employeeEmail().isBlank()
                || cmd.learningTitle() == null || cmd.learningTitle().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Employee email and learning title are required.");
        }
        User employee = users.findByEmailIgnoreCase(cmd.employeeEmail().trim())
                .filter(u -> "ROLE_EMPLOYEE".equals(u.getRole()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "No employee exists with that email."));

        User mentor = resolveMentor(employee, cmd.mentorEmail());
        String title = cmd.learningTitle().trim();

        LearningEnrollment enrollment = enrollments
                .findFirstByEmployeeEmailIgnoreCaseAndLearningTitleIgnoreCase(employee.getEmail(), title)
                .orElse(null);
        boolean created = enrollment == null;
        if (created) {
            enrollment = new LearningEnrollment();
            enrollment.setEmployeeEmail(employee.getEmail());
            enrollment.setLearningTitle(title);
            enrollment.setProgressPercent(0);
            enrollment.setStatus(PENDING);
            enrollment.setAssignedAt(Instant.now());
        } else if (COMPLETED.equals(normalizeStatus(enrollment.getStatus()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This employee has already completed \"" + title + "\".");
        }
        // Never reset progress on a re-assignment; only refresh metadata.
        if (mentor != null) enrollment.setMentorEmail(mentor.getEmail());
        if (cmd.competency() != null && !cmd.competency().isBlank()) enrollment.setCompetency(cmd.competency().trim());
        if (cmd.resourceId() != null) enrollment.setResourceId(cmd.resourceId());
        if (cmd.dueDate() != null) enrollment.setDueDate(cmd.dueDate());
        enrollment.setAssignedBy(assigner == null ? "SYSTEM" : assigner.getEmail());
        enrollment.setSource(cmd.source() == null ? "HR_MANUAL" : cmd.source());
        enrollment.setUpdatedAt(Instant.now());
        enrollment = enrollments.save(enrollment);

        if (created) {
            notify(employee, "New learning assigned",
                    "\"" + title + "\" was added to your learning plan"
                            + (enrollment.getDueDate() == null ? "." : " (due " + enrollment.getDueDate() + ")."));
            if (mentor != null && (assigner == null || !assigner.getEmail().equalsIgnoreCase(mentor.getEmail()))) {
                notify(mentor, "Mentee learning assigned",
                        displayName(employee) + " was assigned \"" + title + "\". You will see their progress live.");
            }
        }
        return enrollment;
    }

    /** Explicit mentor if valid; otherwise the employee's latest ACCEPTED mentor; otherwise none. */
    private User resolveMentor(User employee, String requestedMentorEmail) {
        if (requestedMentorEmail != null && !requestedMentorEmail.isBlank()) {
            return users.findByEmailIgnoreCase(requestedMentorEmail.trim())
                    .filter(u -> "ROLE_MENTOR".equals(u.getRole()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "The selected mentor is not available."));
        }
        return mentorshipRequests.findByEmployeeEmailIgnoreCaseOrderByCreatedAtDesc(employee.getEmail()).stream()
                .filter(r -> "ACCEPTED".equalsIgnoreCase(r.getStatus()))
                .map(MentorshipRequest::getMentorEmail)
                .findFirst()
                .flatMap(users::findByEmailIgnoreCase)
                .orElse(null);
    }

    // ------------------------------------------------------------------ employee reports progress

    @Transactional
    public LearningEnrollment updateProgress(User employee, Long enrollmentId, int percent, String note) {
        if (percent < 0 || percent > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Progress must be between 0 and 100.");
        }
        LearningEnrollment enrollment = enrollments
                .findByIdAndEmployeeEmailIgnoreCase(enrollmentId, employee.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "That learning assignment was not found."));
        if (COMPLETED.equals(normalizeStatus(enrollment.getStatus()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This course is already completed. Ask HR if it needs to be reopened.");
        }
        if (percent < enrollment.getProgressPercent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Progress cannot go backwards (currently " + enrollment.getProgressPercent() + "%).");
        }

        int before = enrollment.getProgressPercent();
        String statusBefore = normalizeStatus(enrollment.getStatus());
        Instant now = Instant.now();

        enrollment.setProgressPercent(percent);
        enrollment.setStatus(statusFor(percent));
        if (percent > 0 && enrollment.getStartedAt() == null) enrollment.setStartedAt(now);
        if (percent >= 100) enrollment.setCompletedAt(now);
        if (note != null && !note.isBlank()) {
            enrollment.setLastNote(note.trim().length() > 1000 ? note.trim().substring(0, 1000) : note.trim());
        }
        enrollment.setUpdatedAt(now);
        enrollment = enrollments.save(enrollment);

        // Tell the people connected to this employee only when something meaningful happened.
        boolean justStarted = PENDING.equals(statusBefore) && percent > 0;
        boolean justCompleted = percent >= 100;
        boolean milestone = percent / 25 > before / 25; // crossed 25/50/75
        if (justStarted || justCompleted || milestone) {
            String headline = justCompleted ? "Course completed"
                    : justStarted ? "Course started" : "Learning milestone";
            String body = displayName(employee) + (justCompleted ? " completed \"" : " is now " + percent + "% through \"")
                    + enrollment.getLearningTitle() + "\".";
            if (enrollment.getMentorEmail() != null) {
                users.findByEmailIgnoreCase(enrollment.getMentorEmail()).ifPresent(m -> notify(m, headline, body));
            }
            if (justCompleted && enrollment.getAssignedBy() != null && !"SYSTEM".equals(enrollment.getAssignedBy())
                    && !enrollment.getAssignedBy().equalsIgnoreCase(enrollment.getMentorEmail())) {
                users.findByEmailIgnoreCase(enrollment.getAssignedBy()).ifPresent(hr -> notify(hr, headline, body));
            }
        }
        return enrollment;
    }

    /** HR correction (e.g. classroom course finished offline). Can move progress either way. */
    @Transactional
    public LearningEnrollment hrSetProgress(Long enrollmentId, int percent) {
        if (percent < 0 || percent > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Progress must be between 0 and 100.");
        }
        LearningEnrollment e = enrollments.findById(enrollmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Enrollment not found."));
        Instant now = Instant.now();
        e.setProgressPercent(percent);
        e.setStatus(statusFor(percent));
        if (percent > 0 && e.getStartedAt() == null) e.setStartedAt(now);
        e.setCompletedAt(percent >= 100 ? now : null);
        e.setUpdatedAt(now);
        return enrollments.save(e);
    }

    // ------------------------------------------------------------------ assessment closes the loop

    /**
     * Called after a new assessment is saved. If the employee now meets the target for a topic,
     * the ACTIVE generated plan for that topic is closed so HR stops seeing a gap that is gone.
     */
    @Transactional
    public void closePlansForMetTargets(String employeeEmail, Map<String, Boolean> topicMetTarget) {
        for (GeneratedSkillProgram program : programs.findByEmployeeEmailIgnoreCaseAndStatus(employeeEmail, "ACTIVE")) {
            Boolean met = topicMetTarget.entrySet().stream()
                    .filter(e -> e.getKey().equalsIgnoreCase(program.getCompetency()))
                    .map(Map.Entry::getValue).findFirst().orElse(null);
            if (Boolean.TRUE.equals(met)) {
                program.setStatus("COMPLETED");
                programs.save(program);
            }
        }
    }

    // ------------------------------------------------------------------ view

    public List<LearningEnrollment> forEmployee(String email) {
        return enrollments.findByEmployeeEmailIgnoreCaseOrderByUpdatedAtDesc(email);
    }

    public Map<String, Object> toView(LearningEnrollment e) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", e.getId());
        view.put("title", e.getLearningTitle());
        view.put("competency", e.getCompetency());
        view.put("status", normalizeStatus(e.getStatus()));
        view.put("progressPercent", e.getProgressPercent());
        view.put("mentorEmail", e.getMentorEmail());
        view.put("assignedBy", e.getAssignedBy());
        view.put("source", e.getSource());
        view.put("assignedAt", e.getAssignedAt());
        view.put("startedAt", e.getStartedAt());
        view.put("completedAt", e.getCompletedAt());
        view.put("dueDate", e.getDueDate());
        view.put("overdue", e.getDueDate() != null && e.getDueDate().isBefore(LocalDate.now())
                && !COMPLETED.equals(normalizeStatus(e.getStatus())));
        view.put("lastNote", e.getLastNote());
        view.put("resourceId", e.getResourceId());
        view.put("updatedAt", e.getUpdatedAt());
        return view;
    }

    // ------------------------------------------------------------------ helpers

    private void notify(User recipient, String title, String message) {
        HrNotification n = new HrNotification();
        n.setTitle(title);
        n.setMessage(message);
        n.setAudience(recipient.getRole());          // same convention NotificationController uses
        n.setRecipientEmail(recipient.getEmail());
        n.setRecipientRole(recipient.getRole());
        n.setSenderRole("SYSTEM");
        n.setNotificationType("LEARNING_PROGRESS");
        n.setSentAt(Instant.now());
        notifications.save(n);
    }

    private String displayName(User user) {
        String name = ((user.getFirstName() == null ? "" : user.getFirstName()) + " "
                + (user.getLastName() == null ? "" : user.getLastName())).trim();
        return name.isBlank() ? user.getEmail() : name;
    }
}
