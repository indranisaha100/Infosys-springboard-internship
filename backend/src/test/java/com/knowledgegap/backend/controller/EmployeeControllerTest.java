package com.knowledgegap.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledgegap.backend.model.AssessmentRecommendation;
import com.knowledgegap.backend.model.AssessmentScore;
import com.knowledgegap.backend.model.RecommendationScoresRequest;
import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.AssessmentRecommendationRepository;
import com.knowledgegap.backend.repository.AssessmentScoreRepository;
import com.knowledgegap.backend.repository.UserRepository;
import com.knowledgegap.backend.security.JwtTokenProvider;
import com.knowledgegap.backend.service.GeminiRecommendationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EmployeeControllerTest {
    private static final String EMAIL = "employee@example.com";
    private static final String AUTHORIZATION = "Bearer valid-token";

    private final UserRepository userRepository = mock(UserRepository.class);
    private final JwtTokenProvider jwtTokenProvider = mock(JwtTokenProvider.class);
    private final GeminiRecommendationService geminiService = mock(GeminiRecommendationService.class);
    private final AssessmentScoreRepository scoreRepository = mock(AssessmentScoreRepository.class);
    private final AssessmentRecommendationRepository recommendationRepository =
            mock(AssessmentRecommendationRepository.class);
    private final EmployeeController controller = new EmployeeController(
            userRepository, jwtTokenProvider, geminiService, scoreRepository,
            recommendationRepository, new ObjectMapper());

    private User employee;

    @BeforeEach
    void authenticateEmployee() {
        employee = new User();
        employee.setEmail(EMAIL);
        employee.setFirstName("Ada");
        employee.setLastName("Lovelace");
        employee.setRole("ROLE_EMPLOYEE");
        when(jwtTokenProvider.validateToken("valid-token")).thenReturn(true);
        when(jwtTokenProvider.getEmailFromJWT("valid-token")).thenReturn(EMAIL);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(employee));
    }

    @Test
    void savesEveryTopicScoreForAuthenticatedEmployee() {
        RecommendationScoresRequest request = new RecommendationScoresRequest();
        request.setScores(validScores());

        ResponseEntity<?> response = controller.saveAssessment(AUTHORIZATION, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        var savedScores = org.mockito.ArgumentCaptor.forClass(Iterable.class);
        verify(scoreRepository).saveAll(savedScores.capture());
        List<Object> records = new ArrayList<>();
        savedScores.getValue().forEach(records::add);
        assertEquals(6, records.size());
        assertInstanceOf(AssessmentScore.class, records.get(0));
        AssessmentScore firstScore = (AssessmentScore) records.get(0);
        assertEquals(EMAIL, firstScore.getEmployeeEmail());
        assertNotNull(firstScore.getSubmittedAt());
    }

    @Test
    void rejectsIncompleteOrInvalidAssessmentScores() {
        RecommendationScoresRequest request = new RecommendationScoresRequest();
        request.setScores(validScores().subList(0, 5));

        ResponseEntity<?> response = controller.saveAssessment(AUTHORIZATION, request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verify(scoreRepository, never()).saveAll(any());
    }

    @Test
    void generatesAndPersistsRecommendationUsingLatestDatabaseScores() {
        Instant submittedAt = Instant.parse("2026-10-29T10:00:00Z");
        List<AssessmentScore> persistedScores = validScores().stream()
                .map(score -> {
                    AssessmentScore record = new AssessmentScore();
                    record.setEmployeeEmail(EMAIL);
                    record.setTopic(score.getTopic());
                    record.setRightAnswers(score.getRight());
                    record.setTotalQuestions(score.getTotal());
                    record.setTargetAnswers(score.getTarget());
                    record.setSubmittedAt(submittedAt);
                    return record;
                })
                .toList();
        when(scoreRepository.findByEmployeeEmailOrderBySubmittedAtDesc(EMAIL)).thenReturn(persistedScores);
        when(recommendationRepository.findByEmployeeEmailAndAssessmentSubmittedAt(EMAIL, submittedAt))
                .thenReturn(Optional.empty());
        when(geminiService.generateSkillRecommendations(anyString(), anyList()))
                .thenReturn(Map.of("overview", "Focus on the highest-priority gaps."));

        ResponseEntity<?> response = controller.recommendations(AUTHORIZATION, false);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(Map.of("overview", "Focus on the highest-priority gaps."), response.getBody());
        var savedRecommendation = org.mockito.ArgumentCaptor.forClass(AssessmentRecommendation.class);
        verify(recommendationRepository).save(savedRecommendation.capture());
        assertEquals(EMAIL, savedRecommendation.getValue().getEmployeeEmail());
        assertEquals(submittedAt, savedRecommendation.getValue().getAssessmentSubmittedAt());
        assertTrue(savedRecommendation.getValue().getRecommendationJson()
                .contains("Focus on the highest-priority gaps."));
        assertNotNull(savedRecommendation.getValue().getGeneratedAt());
        verify(geminiService).generateSkillRecommendations(anyString(), anyList());
    }

    private List<RecommendationScoresRequest.ScoreDto> validScores() {
        return List.of(
                score("Java", 1, 2, 2),
                score("SQL", 2, 2, 2),
                score("React", 1, 2, 1),
                score("Problem Solving", 0, 2, 2),
                score("REST APIs", 1, 2, 1),
                score("Git and Version Control", 2, 2, 1));
    }

    private RecommendationScoresRequest.ScoreDto score(String topic, int right, int total, int target) {
        RecommendationScoresRequest.ScoreDto score = new RecommendationScoresRequest.ScoreDto();
        score.setTopic(topic);
        score.setRight(right);
        score.setTotal(total);
        score.setTarget(target);
        return score;
    }
}
