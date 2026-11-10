package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.model.AssessmentScore;
import com.knowledgegap.backend.model.AssessmentRecommendation;
import com.knowledgegap.backend.model.RecommendationScoresRequest;
import com.knowledgegap.backend.model.EmployeeNotificationRead;
import com.knowledgegap.backend.model.HrNotification;
import com.knowledgegap.backend.model.TrainingProgramme;
import com.knowledgegap.backend.model.Feedback;
import com.knowledgegap.backend.repository.AssessmentRecommendationRepository;
import com.knowledgegap.backend.repository.AssessmentScoreRepository;
import com.knowledgegap.backend.repository.UserRepository;
import com.knowledgegap.backend.repository.LearningResourceRepository;
import com.knowledgegap.backend.repository.HrNotificationRepository;
import com.knowledgegap.backend.repository.EmployeeNotificationReadRepository;
import com.knowledgegap.backend.repository.TrainingProgrammeRepository;
import com.knowledgegap.backend.repository.FeedbackRepository;
import com.knowledgegap.backend.security.JwtTokenProvider;
import com.knowledgegap.backend.service.GeminiRecommendationService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ContentDisposition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.time.Instant;
import java.util.Set;
import java.util.HashSet;

@RestController
@RequestMapping("/api/employee")
public class EmployeeController {
    private static final Map<String, Integer> ASSESSMENT_TARGETS = Map.of(
            "Java", 2,
            "SQL", 2,
            "React", 1,
            "Problem Solving", 2,
            "REST APIs", 1,
            "Git and Version Control", 1);
    private static final int QUESTIONS_PER_TOPIC = 2;

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final GeminiRecommendationService geminiRecommendationService;
    private final AssessmentScoreRepository assessmentScoreRepository;
    private final AssessmentRecommendationRepository assessmentRecommendationRepository;
    private final ObjectMapper objectMapper;
    private final LearningResourceRepository learningResourceRepository;
    private final HrNotificationRepository hrNotificationRepository;
    private final EmployeeNotificationReadRepository employeeNotificationReadRepository;
    private final TrainingProgrammeRepository trainingProgrammeRepository;
    private final FeedbackRepository feedbackRepository;

    @Autowired
    public EmployeeController(UserRepository userRepository, JwtTokenProvider jwtTokenProvider,
            GeminiRecommendationService geminiRecommendationService,
            AssessmentScoreRepository assessmentScoreRepository,
            AssessmentRecommendationRepository assessmentRecommendationRepository,
            ObjectMapper objectMapper,
            LearningResourceRepository learningResourceRepository,
            HrNotificationRepository hrNotificationRepository,
            EmployeeNotificationReadRepository employeeNotificationReadRepository,
            TrainingProgrammeRepository trainingProgrammeRepository,
            FeedbackRepository feedbackRepository) {
        this.userRepository = userRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.geminiRecommendationService = geminiRecommendationService;
        this.assessmentScoreRepository = assessmentScoreRepository;
        this.assessmentRecommendationRepository = assessmentRecommendationRepository;
        this.objectMapper = objectMapper;
        this.learningResourceRepository = learningResourceRepository;
        this.hrNotificationRepository = hrNotificationRepository;
        this.employeeNotificationReadRepository = employeeNotificationReadRepository;
        this.trainingProgrammeRepository = trainingProgrammeRepository;
        this.feedbackRepository = feedbackRepository;
    }

    public EmployeeController(UserRepository userRepository, JwtTokenProvider jwtTokenProvider,
            GeminiRecommendationService geminiRecommendationService,
            AssessmentScoreRepository assessmentScoreRepository,
            AssessmentRecommendationRepository assessmentRecommendationRepository,
            ObjectMapper objectMapper) {
        this(userRepository, jwtTokenProvider, geminiRecommendationService,
                assessmentScoreRepository, assessmentRecommendationRepository, objectMapper,
                null, null, null, null, null);
    }

    @PostMapping("/assessments")
    @Transactional
    public ResponseEntity<?> saveAssessment(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody(required = false) RecommendationScoresRequest request) {
        Optional<User> user = authenticatedEmployee(authorization);
        if (user.isEmpty()) return unauthorized();
        if (!isValidAssessment(request)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Valid assessment scores are required."));
        }

        Instant submittedAt = Instant.now();
        List<AssessmentScore> records = request.getScores().stream().map(score -> {
            AssessmentScore record = new AssessmentScore();
            record.setEmployeeEmail(user.get().getEmail());
            record.setTopic(score.getTopic());
            record.setRightAnswers(score.getRight());
            record.setTotalQuestions(score.getTotal());
            record.setTargetAnswers(score.getTarget());
            record.setSubmittedAt(submittedAt);
            return record;
        }).toList();
        assessmentScoreRepository.saveAll(records);
        return ResponseEntity.ok(Map.of("message", "Assessment scores saved.", "submittedAt", submittedAt));
    }

    @GetMapping("/assessments/latest")
    public ResponseEntity<?> latestAssessment(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Optional<User> user = authenticatedEmployee(authorization);
        if (user.isEmpty()) return unauthorized();

        List<AssessmentScore> scores = assessmentScoreRepository
                .findByEmployeeEmailOrderBySubmittedAtDesc(user.get().getEmail());
        if (scores.isEmpty()) {
            return ResponseEntity.ok(Map.of("scores", List.of()));
        }

        Instant latestSubmission = scores.get(0).getSubmittedAt();
        return ResponseEntity.ok(Map.of(
                "submittedAt", latestSubmission,
                "scores", scoreDtosForSubmission(scores, latestSubmission)));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard(@RequestHeader(value = "Authorization", required = false) String authorization) {
        Optional<User> user = authenticatedEmployee(authorization);
        if (user.isEmpty()) return unauthorized();

        return ResponseEntity.ok(Map.of(
                "user", userSummary(user.get()),
                "readiness", Map.of("score", 78, "label", "Strong foundation", "change", "Up 6% this quarter"),
                "stats", List.of(
                        Map.of("label", "Total skills", "value", "24", "note", "Across 5 categories"),
                        Map.of("label", "Skills to improve", "value", "6", "note", "2 are high priority"),
                        Map.of("label", "Learning progress", "value", "68%", "note", "+12% this month"),
                        Map.of("label", "Completed trainings", "value", "12", "note", "3 this quarter")),
                "gaps", List.of(
                        Map.of("name", "Product", "current", 62, "required", 77),
                        Map.of("name", "Advanced", "current", 55, "required", 77),
                        Map.of("name", "Data-Informed", "current", 68, "required", 73),
                        Map.of("name", "Stakeholder", "current", 70, "required", 73)),
                "assessments", List.of(
                        assessment("PR", "Product Strategy", 78, 90, "-12%", "Medium"),
                        assessment("AD", "Advanced Prototyping", 62, 90, "-28%", "High"),
                        assessment("DA", "Data-Informed Design", 68, 85, "-17%", "Medium"),
                        assessment("ST", "Stakeholder Management", 82, 85, "-3%", "Low"))));
    }

    @GetMapping("/recommendations/skills")
    public ResponseEntity<?> recommendations(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(defaultValue = "false") boolean refresh) {
        Optional<User> user = authenticatedEmployee(authorization);
        if (user.isEmpty()) return unauthorized();

        List<AssessmentScore> savedScores = assessmentScoreRepository
                .findByEmployeeEmailOrderBySubmittedAtDesc(user.get().getEmail());
        if (savedScores.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Submit a skill assessment before requesting recommendations."));
        }

        Instant submittedAt = savedScores.get(0).getSubmittedAt();
        List<RecommendationScoresRequest.ScoreDto> scores = scoreDtosForSubmission(savedScores, submittedAt);
        Optional<AssessmentRecommendation> savedRecommendation =
                assessmentRecommendationRepository.findByEmployeeEmailAndAssessmentSubmittedAt(
                        user.get().getEmail(), submittedAt);
        if (!refresh && savedRecommendation.isPresent()) {
            try {
                return ResponseEntity.ok(objectMapper.readValue(
                        savedRecommendation.get().getRecommendationJson(),
                        new TypeReference<Map<String, Object>>() {}));
            } catch (JsonProcessingException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "The saved recommendation could not be read. Refresh to generate it again.");
            }
        }

        User employee = user.get();
        String employeeName = ((employee.getFirstName() == null ? "" : employee.getFirstName()) + " "
                + (employee.getLastName() == null ? "" : employee.getLastName())).trim();
        if (employeeName.isBlank()) employeeName = employee.getEmail();

        try {
            Map<String, Object> recommendation = geminiRecommendationService.generateSkillRecommendations(
                    employeeName, scores);
            AssessmentRecommendation saved = savedRecommendation.orElseGet(AssessmentRecommendation::new);
            saved.setEmployeeEmail(employee.getEmail());
            saved.setAssessmentSubmittedAt(submittedAt);
            saved.setRecommendationJson(objectMapper.writeValueAsString(recommendation));
            saved.setGeneratedAt(Instant.now());
            assessmentRecommendationRepository.save(saved);
            return ResponseEntity.ok(recommendation);
        } catch (ResponseStatusException exception) {
            String message = exception.getReason() == null
                    ? "Recommendations could not be generated. Please try again."
                    : exception.getReason();
            return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", message));
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "The recommendation could not be saved.");
        }
    }
        @PostMapping("/chat")
public ResponseEntity<?> chat(
        @RequestHeader(value = "Authorization", required = false) String authorization,
        @RequestBody Map<String, String> body) {
    Optional<User> user = authenticatedEmployee(authorization);
    if (user.isEmpty()) return unauthorized();
    String message = body.getOrDefault("message", "").trim();
    if (message.isEmpty() || message.length() > 1000) {
        return ResponseEntity.badRequest().body(Map.of("message", "Enter a message up to 1000 characters."));
    }
    List<AssessmentScore> saved = assessmentScoreRepository
            .findByEmployeeEmailOrderBySubmittedAtDesc(user.get().getEmail());
    var scores = saved.isEmpty() ? List.<RecommendationScoresRequest.ScoreDto>of()
            : scoreDtosForSubmission(saved, saved.get(0).getSubmittedAt());
    try {
        String name = user.get().getFirstName() == null ? "the employee" : user.get().getFirstName();
        return ResponseEntity.ok(Map.of("reply", geminiRecommendationService.chat(name, scores, message)));
    } catch (ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", String.valueOf(e.getReason())));
    }
}


    @GetMapping("/sections/{section}")
    public ResponseEntity<?> section(@PathVariable String section,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Optional<User> user = authenticatedEmployee(authorization);
        if (user.isEmpty()) return unauthorized();

        return switch (section.toLowerCase()) {
            case "skills" -> ResponseEntity.ok(Map.of("section", "My Skills", "message", "Your 24 tracked skills are up to date.", "items", List.of("Product Strategy", "Advanced Prototyping", "Data-Informed Design", "Stakeholder Management")));
            case "gaps" -> ResponseEntity.ok(Map.of("section", "Knowledge Gaps", "message", "You have 6 skills to improve, including 2 high-priority gaps."));
            case "learning" -> ResponseEntity.ok(employeeLearning(user.get()));
            case "programmes", "training-programmes" -> ResponseEntity.ok(employeeProgrammes());
            case "feedback" -> ResponseEntity.ok(employeeFeedback(user.get()));
            case "notifications" -> ResponseEntity.ok(employeeNotifications(user.get()));
            case "reports" -> ResponseEntity.ok(Map.of("section", "Reports", "message", "Your latest skills assessment report is ready."));
            case "profile" -> ResponseEntity.ok(Map.of("section", "My Profile", "user", userSummary(user.get())));
            case "settings" -> ResponseEntity.ok(Map.of("section", "Settings", "message", "Your workspace settings are available."));
            default -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Employee section not found."));
        };
    }

    private Map<String, Object> employeeLearning(User user) {
        List<Map<String, Object>> resources = learningResourceRepository.findByActiveTrueOrderByTitleAsc().stream()
                .map(resource -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", resource.getId());
                    item.put("title", resource.getTitle());
                    item.put("category", resource.getCategory());
                    item.put("pdfFileName", resource.getPdfFileName());
                    item.put("pdfUrl", resource.getPdfData() == null ? null : "/employee/resources/" + resource.getId() + "/pdf");
                    return item;
                })
                .toList();
        return Map.of(
                "section", "My Learning",
                "message", resources.isEmpty()
                        ? "No learning resources have been published yet."
                        : "Published learning resources available for your development.",
                "items", resources,
                "employeeEmail", user.getEmail());
    }

    @GetMapping("/resources/{id}/pdf")
    public ResponseEntity<?> downloadLearningPdf(@RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Long id) {
        Optional<User> user = authenticatedEmployee(authorization);
        if (user.isEmpty()) return unauthorized();
        return learningResourceRepository.findById(id)
                .filter(resource -> resource.isActive() && resource.getPdfData() != null)
                .map(resource -> ResponseEntity.ok().contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                        .header(HttpHeaders.CONTENT_DISPOSITION,
                                ContentDisposition.attachment().filename(resource.getPdfFileName()).build().toString())
                        .body(resource.getPdfData()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private Map<String, Object> employeeProgrammes() {
        List<String> programmes = trainingProgrammeRepository.findAllByOrderByStartDateAsc().stream()
                .filter(programme -> !"CANCELLED".equalsIgnoreCase(programme.getStatus()))
                .map(this::programmeSummary)
                .toList();
        return Map.of(
                "section", "Training Programmes",
                "message", programmes.isEmpty() ? "No training programmes are currently scheduled."
                        : "Upcoming organisation training programmes.",
                "items", programmes);
    }

    private Map<String, Object> employeeFeedback(User user) {
        List<String> records = feedbackRepository.findByEmployeeEmailOrderBySubmittedAtDesc(user.getEmail()).stream()
                .map(feedback -> feedback.getSubject() + " · Rating " + feedback.getRating() + "/5"
                        + (feedback.getComment() == null || feedback.getComment().isBlank()
                                ? "" : " · " + feedback.getComment()))
                .toList();
        return Map.of("section", "Feedback", "message",
                records.isEmpty() ? "You have not submitted learning feedback yet." : "Your submitted learning feedback.",
                "items", records);
    }

    @PostMapping("/feedback")
    public ResponseEntity<?> submitFeedback(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody Feedback input) {
        Optional<User> user = authenticatedEmployee(authorization);
        if (user.isEmpty()) return unauthorized();
        if (input == null || input.getSubject() == null || input.getSubject().isBlank()
                || input.getRating() < 1 || input.getRating() > 5) {
            return ResponseEntity.badRequest().body(Map.of("message", "Subject and a rating from 1 to 5 are required."));
        }
        input.setId(null);
        input.setEmployeeEmail(user.get().getEmail());
        input.setSubmittedAt(Instant.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(feedbackRepository.save(input));
    }

    private String programmeSummary(TrainingProgramme programme) {
        String dates = programme.getStartDate() == null ? "Date to be announced"
                : programme.getStartDate() + (programme.getEndDate() == null ? "" : " to " + programme.getEndDate());
        return programme.getName() + " · " + dates + " · "
                + (programme.getStatus() == null ? "Upcoming" : programme.getStatus());
    }

    @GetMapping("/notifications/unread-count")
    public ResponseEntity<?> unreadNotificationCount(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Optional<User> user = authenticatedEmployee(authorization);
        if (user.isEmpty()) return unauthorized();
        return ResponseEntity.ok(Map.of("count", unreadNotifications(user.get()).size()));
    }

    @PostMapping("/notifications/read")
    public ResponseEntity<?> markNotificationsRead(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Optional<User> user = authenticatedEmployee(authorization);
        if (user.isEmpty()) return unauthorized();

        List<HrNotification> visible = visibleNotifications();
        if (visible.isEmpty()) return ResponseEntity.ok(Map.of("message", "No notifications to mark as read."));
        Set<Long> visibleIds = new HashSet<>(visible.stream().map(com.knowledgegap.backend.model.HrNotification::getId).toList());
        Set<Long> readIds = new HashSet<>(employeeNotificationReadRepository
                .findByEmployeeEmailAndNotificationIdIn(user.get().getEmail(), visibleIds).stream()
                .map(EmployeeNotificationRead::getNotificationId).toList());
        employeeNotificationReadRepository.saveAll(visible.stream()
                .filter(notification -> !readIds.contains(notification.getId()))
                .map(notification -> new EmployeeNotificationRead(user.get().getEmail(), notification.getId()))
                .toList());
        return ResponseEntity.ok(Map.of("message", "Notifications marked as read."));
    }

    private Map<String, Object> employeeNotifications(User user) {
        List<String> notifications = visibleNotifications().stream()
                .filter(notification -> notification.getAudience() == null
                        || notification.getAudience().isBlank()
                        || notification.getAudience().toLowerCase().contains("all")
                        || notification.getAudience().toLowerCase().contains("employee"))
                .map(notification -> notification.getTitle() + " — " + notification.getMessage())
                .toList();
        return Map.of(
                "section", "Notifications",
                "message", notifications.isEmpty()
                        ? "You have no new notifications."
                        : "You have " + notifications.size() + " HR notification(s).",
                "items", notifications);
    }

    private List<HrNotification> visibleNotifications() {
        return hrNotificationRepository.findAllByOrderBySentAtDesc().stream()
                .filter(notification -> notification.getAudience() == null
                        || notification.getAudience().isBlank()
                        || notification.getAudience().toLowerCase().contains("all")
                        || notification.getAudience().toLowerCase().contains("employee"))
                .toList();
    }

    private List<HrNotification> unreadNotifications(User user) {
        List<HrNotification> visible = visibleNotifications();
        if (visible.isEmpty()) return List.of();
        Set<Long> ids = new HashSet<>(visible.stream().map(HrNotification::getId).toList());
        Set<Long> readIds = new HashSet<>(employeeNotificationReadRepository
                .findByEmployeeEmailAndNotificationIdIn(user.getEmail(), ids).stream()
                .map(EmployeeNotificationRead::getNotificationId).toList());
        return visible.stream().filter(notification -> !readIds.contains(notification.getId())).toList();
    }

    private Optional<User> authenticatedUser(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) return Optional.empty();
        String token = authorization.substring(7);
        if (!jwtTokenProvider.validateToken(token)) return Optional.empty();
        return userRepository.findByEmail(jwtTokenProvider.getEmailFromJWT(token));
    }

    private Optional<User> authenticatedEmployee(String authorization) {
        return authenticatedUser(authorization).filter(user -> "ROLE_EMPLOYEE".equals(user.getRole()));
    }

    private boolean isValidAssessment(RecommendationScoresRequest request) {
        if (request == null || request.getScores() == null
                || request.getScores().size() != ASSESSMENT_TARGETS.size()) {
            return false;
        }

        Set<String> topics = new HashSet<>();
        for (RecommendationScoresRequest.ScoreDto score : request.getScores()) {
            if (score == null || score.getTopic() == null
                    || !ASSESSMENT_TARGETS.containsKey(score.getTopic())
                    || !topics.add(score.getTopic())
                    || score.getTotal() != QUESTIONS_PER_TOPIC
                    || score.getRight() < 0 || score.getRight() > score.getTotal()
                    || score.getTarget() != ASSESSMENT_TARGETS.get(score.getTopic())) {
                return false;
            }
        }
        return topics.size() == ASSESSMENT_TARGETS.size();
    }

    private List<RecommendationScoresRequest.ScoreDto> scoreDtosForSubmission(
            List<AssessmentScore> savedScores, Instant submittedAt) {
        List<RecommendationScoresRequest.ScoreDto> scores = savedScores.stream()
                .filter(score -> submittedAt.equals(score.getSubmittedAt()))
                .map(score -> {
                    RecommendationScoresRequest.ScoreDto dto = new RecommendationScoresRequest.ScoreDto();
                    dto.setTopic(score.getTopic());
                    dto.setRight(score.getRightAnswers());
                    dto.setTotal(score.getTotalQuestions());
                    dto.setTarget(score.getTargetAnswers());
                    return dto;
                })
                .toList();
        RecommendationScoresRequest request = new RecommendationScoresRequest();
        request.setScores(scores);
        if (!isValidAssessment(request)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "The saved assessment is incomplete. Submit the assessment again.");
        }
        return scores;
    }

    private Map<String, Object> userSummary(User user) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("email", user.getEmail());
        summary.put("firstName", user.getFirstName());
        summary.put("lastName", user.getLastName());
        summary.put("role", user.getRole());
        return summary;
    }

    private Map<String, Object> assessment(String code, String name, int current, int required, String gap, String priority) {
        return Map.of("code", code, "name", name, "current", current,
                "required", required, "gap", gap, "priority", priority);
    }

    private ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "A valid employee session is required."));
    }
}