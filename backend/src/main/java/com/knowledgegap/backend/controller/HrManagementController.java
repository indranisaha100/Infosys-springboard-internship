package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.model.*;
import com.knowledgegap.backend.repository.*;
import com.knowledgegap.backend.security.JwtTokenProvider;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Base64;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.ContentDisposition;
import org.springframework.web.bind.annotation.CrossOrigin;

@RestController
@RequestMapping("/api/hr")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = { RequestMethod.GET, RequestMethod.POST,
        RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS })
public class HrManagementController {
    private final CompetencyRepository competencies;
    private final LearningResourceRepository resources;
    private final LearningPathRepository paths;
    private final TrainingProgrammeRepository programmes;
    private final RoleRequirementRepository roleRequirements;
    private final LearningEnrollmentRepository enrollments;
    private final FeedbackRepository feedback;
    private final HrNotificationRepository notifications;
    private final UserRepository users;
    private final JwtTokenProvider tokens;

    public HrManagementController(CompetencyRepository competencies, LearningResourceRepository resources,
            LearningPathRepository paths, TrainingProgrammeRepository programmes, UserRepository users,
            JwtTokenProvider tokens, RoleRequirementRepository roleRequirements,
            LearningEnrollmentRepository enrollments, FeedbackRepository feedback,
            HrNotificationRepository notifications) {
        this.competencies = competencies;
        this.resources = resources;
        this.paths = paths;
        this.programmes = programmes;
        this.roleRequirements = roleRequirements;
        this.users = users;
        this.tokens = tokens;
        this.enrollments = enrollments;
        this.feedback = feedback;
        this.notifications = notifications;
    }

    @GetMapping("/competencies")
    public ResponseEntity<?> competencies(@RequestHeader(value = "Authorization", required = false) String auth) {
        if (!authorized(auth)) return unauthorized();
        return ResponseEntity.ok(competencies.findByActiveTrueOrderByNameAsc());
    }

    @PostMapping("/competencies")
    public ResponseEntity<?> createCompetency(@RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody Competency competency) {
        if (!authorized(auth)) return unauthorized();
        if (competency.getName() == null || competency.getName().isBlank()) return bad("Competency name is required.");
        competency.setId(null);
        competency.setActive(true);
        return ResponseEntity.status(HttpStatus.CREATED).body(competencies.save(competency));
    }

    @PutMapping("/competencies/{id}")
    public ResponseEntity<?> updateCompetency(@RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id, @RequestBody Competency input) {
        if (!authorized(auth)) return unauthorized();
        return competencies.findById(id).map(existing -> {
            existing.setName(input.getName());
            existing.setCategory(input.getCategory());
            existing.setDescription(input.getDescription());
            existing.setExpectedProficiency(input.getExpectedProficiency());
            return ResponseEntity.ok(competencies.save(existing));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/competencies/{id}")
    public ResponseEntity<?> deleteCompetency(@RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id) {
        if (!authorized(auth)) return unauthorized();
        return competencies.findById(id).map(existing -> {
            existing.setActive(false);
            competencies.save(existing);
            return ResponseEntity.noContent().build();
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/resources")
    public ResponseEntity<?> resources(@RequestHeader(value = "Authorization", required = false) String auth) {
        if (!authorized(auth)) return unauthorized();
        return ResponseEntity.ok(resources.findByActiveTrueOrderByTitleAsc());
    }

    @PostMapping("/resources")
    public ResponseEntity<?> createResource(@RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody LearningResource resource) {
        if (!authorized(auth)) return unauthorized();
        if (resource.getTitle() == null || resource.getTitle().isBlank()) return bad("Learning resource title is required.");
        resource.setId(null);
        resource.setActive(true);
        if (resource.getPdfBase64() != null && !resource.getPdfBase64().isBlank()) {
            try {
                resource.setPdfData(Base64.getDecoder().decode(resource.getPdfBase64()));
                if (resource.getPdfFileName() == null || resource.getPdfFileName().isBlank()) {
                    resource.setPdfFileName("learning-resource.pdf");
                }
                resource.setPdfContentType("application/pdf");
            } catch (IllegalArgumentException exception) {
                return bad("The PDF data is invalid.");
            }
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(resources.save(resource));
    }

    @PostMapping(value = "/resources/pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createPdfResource(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @RequestParam String title,
            @RequestParam String category,
            @RequestParam(required = false) String difficulty,
            @RequestParam(required = false) String competency,
            @RequestParam(required = false) String description,
            @RequestPart("pdf") MultipartFile pdf) {
        if (!authorized(auth)) return unauthorized();
        if (title.isBlank() || category.isBlank()) return bad("Title and category are required.");
        if (pdf == null || pdf.isEmpty()) {
            return bad("A non-empty PDF file is required.");
        }
        String fileName = pdf.getOriginalFilename() == null ? "" : pdf.getOriginalFilename().toLowerCase();
        if (!"application/pdf".equalsIgnoreCase(pdf.getContentType()) && !fileName.endsWith(".pdf")) {
            return bad("Only PDF files are allowed.");
        }
        try {
            LearningResource resource = new LearningResource();
            resource.setTitle(title.trim());
            resource.setCategory(category.trim());
            resource.setDifficulty(difficulty);
            resource.setCompetency(competency);
            resource.setDescription(description);
            resource.setPdfFileName(pdf.getOriginalFilename() == null ? "learning-resource.pdf" : pdf.getOriginalFilename());
            resource.setPdfContentType("application/pdf");
            resource.setPdfData(pdf.getBytes());
            resource.setActive(true);
            return ResponseEntity.status(HttpStatus.CREATED).body(resources.save(resource));
        } catch (java.io.IOException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "The PDF could not be read."));
        }
    }

    @GetMapping("/resources/{id}/pdf")
    public ResponseEntity<?> downloadPdf(@RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id) {
        if (!authorized(auth)) return unauthorized();
        return resources.findById(id)
                .filter(resource -> resource.isActive() && resource.getPdfData() != null)
                .map(resource -> ResponseEntity.ok()
                        .contentType(MediaType.APPLICATION_PDF)
                        .header(HttpHeaders.CONTENT_DISPOSITION,
                                ContentDisposition.attachment().filename(resource.getPdfFileName()).build().toString())
                        .body(resource.getPdfData()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/resources/{id}")
    public ResponseEntity<?> updateResource(@RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id, @RequestBody LearningResource input) {
        if (!authorized(auth)) return unauthorized();
        return resources.findById(id).map(existing -> {
            existing.setTitle(input.getTitle());
            existing.setCategory(input.getCategory());
            existing.setDescription(input.getDescription());
            existing.setUrl(input.getUrl());
            existing.setDifficulty(input.getDifficulty());
            existing.setDurationMinutes(input.getDurationMinutes());
            existing.setCompetency(input.getCompetency());
            return ResponseEntity.ok(resources.save(existing));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/resources/{id}")
    public ResponseEntity<?> deleteResource(@RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id) {
        if (!authorized(auth)) return unauthorized();
        return resources.findById(id).map(existing -> {
            existing.setActive(false);
            resources.save(existing);
            return ResponseEntity.noContent().build();
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/learning-paths")
    public ResponseEntity<?> learningPaths(@RequestHeader(value = "Authorization", required = false) String auth) {
        if (!authorized(auth)) return unauthorized();
        return ResponseEntity.ok(paths.findByActiveTrueOrderByNameAsc());
    }

    @GetMapping("/role-requirements")
    public ResponseEntity<?> roleRequirements(@RequestHeader(value = "Authorization", required = false) String auth) {
        if (!authorized(auth)) return unauthorized();
        return ResponseEntity.ok(roleRequirements.findAllByOrderByRoleNameAsc());
    }

    @PostMapping("/role-requirements")
    public ResponseEntity<?> createRoleRequirement(@RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody RoleRequirement requirement) {
        if (!authorized(auth)) return unauthorized();
        if (requirement.getRoleName() == null || requirement.getRoleName().isBlank()
                || requirement.getCompetency() == null || requirement.getCompetency().isBlank()) {
            return bad("Role name and competency are required.");
        }
        requirement.setId(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(roleRequirements.save(requirement));
    }

    @PostMapping("/learning-paths")
    public ResponseEntity<?> createLearningPath(@RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody LearningPath path) {
        if (!authorized(auth)) return unauthorized();
        if (path.getName() == null || path.getName().isBlank()) return bad("Learning path name is required.");
        path.setId(null);
        path.setActive(true);
        return ResponseEntity.status(HttpStatus.CREATED).body(paths.save(path));
    }

    @GetMapping("/programmes")
    public ResponseEntity<?> programmes(@RequestHeader(value = "Authorization", required = false) String auth) {
        if (!authorized(auth)) return unauthorized();
        return ResponseEntity.ok(programmes.findAllByOrderByStartDateAsc());
    }

    @PostMapping("/programmes")
    public ResponseEntity<?> createProgramme(@RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody TrainingProgramme programme) {
        if (!authorized(auth)) return unauthorized();
        if (programme.getName() == null || programme.getName().isBlank()) return bad("Programme name is required.");
        if (programme.getStartDate() != null && programme.getEndDate() != null
                && programme.getEndDate().isBefore(programme.getStartDate())) {
            return bad("Programme end date cannot be before its start date.");
        }
        programme.setId(null);
        if (programme.getStatus() == null || programme.getStatus().isBlank()) programme.setStatus("Upcoming");
        return ResponseEntity.status(HttpStatus.CREATED).body(programmes.save(programme));
    }

    @GetMapping("/mentors")
    public ResponseEntity<?> mentors(@RequestHeader(value = "Authorization", required = false) String auth) {
        if (!authorized(auth)) return unauthorized();
        return ResponseEntity.ok(users.findByRole("ROLE_MENTOR").stream()
                .filter(user -> user.getStatus() == null || "APPROVED".equalsIgnoreCase(user.getStatus()))
                .map(user -> Map.of(
                        "id", user.getId(),
                        "name", ((user.getFirstName() == null ? "" : user.getFirstName()) + " "
                                + (user.getLastName() == null ? "" : user.getLastName())).trim(),
                        "email", user.getEmail(),
                        "department", user.getDepartment() == null ? "" : user.getDepartment(),
                        "expertise", user.getExpertise() == null ? "" : user.getExpertise()))
                .toList());
    }

    @PutMapping("/mentors/{id}/expertise")
    public ResponseEntity<?> updateMentorExpertise(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id,
            @RequestBody Map<String, String> input) {
        if (!authorized(auth)) return unauthorized();
        if (input == null) return bad("Mentor expertise is required.");
        String expertise = input.getOrDefault("expertise", "").trim();
        if (expertise.length() > 2000) return bad("Mentor expertise must be 2000 characters or fewer.");
        Optional<User> optionalMentor = users.findById(id)
                .filter(user -> "ROLE_MENTOR".equals(user.getRole()));
        if (optionalMentor.isEmpty()) return ResponseEntity.notFound().build();
        User mentor = optionalMentor.get();
        mentor.setExpertise(expertise);
        User saved = users.save(mentor);
        return ResponseEntity.ok(Map.of(
                "id", saved.getId(),
                "name", ((saved.getFirstName() == null ? "" : saved.getFirstName()) + " "
                        + (saved.getLastName() == null ? "" : saved.getLastName())).trim(),
                "email", saved.getEmail(),
                "department", saved.getDepartment() == null ? "" : saved.getDepartment(),
                "expertise", saved.getExpertise() == null ? "" : saved.getExpertise()));
    }

    @GetMapping("/learning-progress")
    public ResponseEntity<?> learningProgress(@RequestHeader(value = "Authorization", required = false) String auth) {
        if (!authorized(auth)) return unauthorized();
        List<LearningEnrollment> records = enrollments.findAllByOrderByUpdatedAtDesc();
        long completed = records.stream().filter(record -> "COMPLETED".equalsIgnoreCase(record.getStatus())).count();
        long inProgress = records.stream().filter(record -> "IN_PROGRESS".equalsIgnoreCase(record.getStatus())).count();
        return ResponseEntity.ok(Map.of("records", records, "total", records.size(), "completed", completed,
                "inProgress", inProgress, "pending", records.size() - completed - inProgress));
    }

    @PostMapping("/learning-progress")
    public ResponseEntity<?> createEnrollment(@RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody LearningEnrollment enrollment) {
        if (!authorized(auth)) return unauthorized();
        if (enrollment.getEmployeeEmail() == null || enrollment.getEmployeeEmail().isBlank()
                || enrollment.getLearningTitle() == null || enrollment.getLearningTitle().isBlank()) {
            return bad("Employee email and learning title are required.");
        }
        enrollment.setId(null);
        enrollment.setUpdatedAt(java.time.Instant.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(enrollments.save(enrollment));
    }

    @GetMapping("/feedback")
    public ResponseEntity<?> feedback(@RequestHeader(value = "Authorization", required = false) String auth) {
        if (!authorized(auth)) return unauthorized();
        List<Feedback> records = feedback.findAllByOrderBySubmittedAtDesc();
        double average = records.stream().mapToInt(Feedback::getRating).average().orElse(0);
        return ResponseEntity.ok(Map.of("records", records, "total", records.size(), "averageRating", average));
    }

    @PostMapping("/feedback")
    public ResponseEntity<?> createFeedback(@RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody Feedback input) {
        if (!authorized(auth)) return unauthorized();
        if (input.getEmployeeEmail() == null || input.getSubject() == null || input.getSubject().isBlank()
                || input.getRating() < 1 || input.getRating() > 5) {
            return bad("Employee email, subject and a rating from 1 to 5 are required.");
        }
        input.setId(null);
        input.setSubmittedAt(java.time.Instant.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(feedback.save(input));
    }

    @GetMapping("/notifications")
    public ResponseEntity<?> notifications(@RequestHeader(value = "Authorization", required = false) String auth) {
        if (!authorized(auth)) return unauthorized();
        return ResponseEntity.ok(notifications.findAllByOrderBySentAtDesc());
    }

    @PostMapping("/notifications")
    public ResponseEntity<?> createNotification(@RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody HrNotification input) {
        if (!authorized(auth)) return unauthorized();
        if (input == null || blank(input.getTitle()) || blank(input.getMessage()) || blank(input.getAudience())) {
            return bad("Title, message and audience are required.");
        }
        input.setTitle(input.getTitle().trim());
        input.setMessage(input.getMessage().trim());
        input.setAudience(input.getAudience().trim());
        input.setId(null);
        input.setSentAt(java.time.Instant.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(notifications.save(input));
    }

    @GetMapping("/reports/summary")
    public ResponseEntity<?> reportSummary(@RequestHeader(value = "Authorization", required = false) String auth) {
        if (!authorized(auth)) return unauthorized();
        List<LearningEnrollment> records = enrollments.findAllByOrderByUpdatedAtDesc();
        return ResponseEntity.ok(Map.of(
                "employees", users.findByRole("ROLE_EMPLOYEE").size(),
                "mentors", users.findByRole("ROLE_MENTOR").size(),
                "competencies", competencies.findByActiveTrueOrderByNameAsc().size(),
                "learningResources", resources.findByActiveTrueOrderByTitleAsc().size(),
                "learningPaths", paths.findByActiveTrueOrderByNameAsc().size(),
                "programmes", programmes.findAllByOrderByStartDateAsc().size(),
                "enrollments", records.size(),
                "completedEnrollments", records.stream().filter(record -> "COMPLETED".equalsIgnoreCase(record.getStatus())).count(),
                "feedback", feedback.count()));
    }

    private boolean authorized(String auth) {
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
