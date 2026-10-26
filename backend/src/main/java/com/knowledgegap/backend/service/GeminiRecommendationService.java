package com.knowledgegap.backend.service;

import com.knowledgegap.backend.model.RecommendationRequest;
import com.knowledgegap.backend.model.RecommendationScoresRequest;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GeminiRecommendationService {

    private final String apiKey = configuredValue("GEMINI_API_KEY");

    private final String modelName = firstConfiguredValue(
            "GEMINI_MODEL_NAME", "GEMINI_MODEL", "gemini-3.1-flash-lite");
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Map<String, Object> generateSkillRecommendations(
            String employeeName, List<RecommendationScoresRequest.ScoreDto> scores) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "GEMINI_API_KEY is not configured. Add it to the backend environment and restart the service.");
        }

        String prompt = buildSkillPlanPrompt(employeeName, scores);
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName
                + ":generateContent?key=" + apiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<String, Object> part = Map.of("text", prompt);
        Map<String, Object> content = Map.of("parts", List.of(part));
        Map<String, Object> responseFormat = Map.of("text", Map.of(
                "mimeType", "APPLICATION_JSON",
                "schema", skillPlanSchema()));
        Map<String, Object> generationConfig = Map.of("responseFormat", responseFormat);
        Map<String, Object> body = Map.of(
                "contents", List.of(content),
                "generationConfig", generationConfig);

        try {
            ResponseEntity<Map> response = new RestTemplate().postForEntity(
                    url, new HttpEntity<>(body, headers), Map.class);
            String responseText = extractResponseText(response.getBody());
            String json = unwrapJson(responseText);
            Map<String, Object> plan = objectMapper.readValue(json, new TypeReference<>() {});
            validateSkillPlan(plan, scores);
            return plan;
        } catch (HttpClientErrorException exception) {
            if (exception.getStatusCode().value() == 429) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                        "Gemini request limit reached. Try again later.");
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Gemini could not generate recommendations. Please try again.");
        } catch (RestClientException | java.io.IOException | IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Gemini returned an unusable recommendation response. Please try again.");
        }
    }

    private String buildSkillPlanPrompt(String employeeName,
            List<RecommendationScoresRequest.ScoreDto> scores) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("Create a practical, personalized four-week skill learning plan for ")
                .append(employeeName == null || employeeName.isBlank() ? "an employee" : employeeName)
                .append(" using these short-assessment scores. Treat scores as practice signals, not a complete measure of ability.\n");
        for (RecommendationScoresRequest.ScoreDto score : scores) {
            prompt.append("- Topic: ").append(score.getTopic())
                    .append("; correct: ").append(score.getRight())
                    .append(" of ").append(score.getTotal())
                    .append("; target: ").append(score.getTarget()).append("\n");
        }
        prompt.append("Return one JSON object with exactly these top-level fields: overview (string), weeklyPlan (array of exactly 4 items), and recommendations (array with one item for each input topic). ")
                .append("Each weeklyPlan item must have week (number 1-4), topic, focus, tasks (array of 2-4 short strings), resource (object with title and https URL), and successCheck. ")
                .append("Each recommendation must have topic, right, total, target, priority (High, Medium, or Stretch), gapSummary, steps (array of 2-4 strings), and resources (array of 1-2 objects). ")
                .append("Each resource object must have title, url (https URL), level, hours (number), source, and reason. Use High when right is 0 and target is above 0, Medium when below target otherwise, and Stretch when the target is met. ")
                .append("Use reputable learning providers or official documentation. Do not claim that a link or course was independently verified. Keep the plan specific, achievable, and grounded in the supplied scores. Return valid JSON only, without Markdown fences.");
        return prompt.toString();
    }

    private Map<String, Object> skillPlanSchema() {
        Map<String, Object> resourceProperties = new HashMap<>();
        resourceProperties.put("title", stringSchema());
        resourceProperties.put("url", stringSchema());
        resourceProperties.put("level", stringSchema());
        resourceProperties.put("hours", Map.of("type", "number"));
        resourceProperties.put("source", stringSchema());
        resourceProperties.put("reason", stringSchema());
        Map<String, Object> resource = objectSchema(resourceProperties,
                "title", "url", "level", "hours", "source", "reason");

        Map<String, Object> weekProperties = new HashMap<>();
        weekProperties.put("week", Map.of("type", "integer"));
        weekProperties.put("topic", stringSchema());
        weekProperties.put("focus", stringSchema());
        weekProperties.put("tasks", arraySchema(stringSchema()));
        weekProperties.put("resource", resource);
        weekProperties.put("successCheck", stringSchema());
        Map<String, Object> week = objectSchema(weekProperties,
                "week", "topic", "focus", "tasks", "resource", "successCheck");

        Map<String, Object> recommendationProperties = new HashMap<>();
        recommendationProperties.put("topic", stringSchema());
        recommendationProperties.put("right", Map.of("type", "integer"));
        recommendationProperties.put("total", Map.of("type", "integer"));
        recommendationProperties.put("target", Map.of("type", "integer"));
        recommendationProperties.put("priority", Map.of(
                "type", "string", "enum", List.of("High", "Medium", "Stretch")));
        recommendationProperties.put("gapSummary", stringSchema());
        recommendationProperties.put("steps", arraySchema(stringSchema()));
        recommendationProperties.put("resources", arraySchema(resource));
        Map<String, Object> recommendation = objectSchema(recommendationProperties,
                "topic", "right", "total", "target", "priority", "gapSummary", "steps", "resources");

        Map<String, Object> planProperties = new HashMap<>();
        planProperties.put("overview", stringSchema());
        planProperties.put("weeklyPlan", arraySchema(week));
        planProperties.put("recommendations", arraySchema(recommendation));
        return objectSchema(planProperties, "overview", "weeklyPlan", "recommendations");
    }

    private Map<String, Object> objectSchema(Map<String, Object> properties, String... required) {
        return Map.of("type", "object", "properties", properties,
                "required", List.of(required), "additionalProperties", false);
    }

    private Map<String, Object> arraySchema(Map<String, Object> items) {
        return Map.of("type", "array", "items", items);
    }

    private Map<String, Object> stringSchema() {
        return Map.of("type", "string");
    }

    private String extractResponseText(Map responseBody) {
        if (responseBody == null || !(responseBody.get("candidates") instanceof List<?> candidates)
                || candidates.isEmpty() || !(candidates.get(0) instanceof Map<?, ?> candidate)
                || !(candidate.get("content") instanceof Map<?, ?> content)
                || !(content.get("parts") instanceof List<?> parts)) {
            throw new IllegalArgumentException("Gemini response did not contain generated text.");
        }

        StringBuilder text = new StringBuilder();
        for (Object part : parts) {
            if (part instanceof Map<?, ?> partMap && partMap.get("text") instanceof String value) {
                text.append(value);
            }
        }
        if (text.isEmpty()) throw new IllegalArgumentException("Gemini response text was empty.");
        return text.toString();
    }

    private String unwrapJson(String responseText) {
        String json = responseText.trim();
        if (json.startsWith("```")) {
            int firstNewline = json.indexOf('\n');
            int closingFence = json.lastIndexOf("```");
            if (firstNewline >= 0 && closingFence > firstNewline) {
                json = json.substring(firstNewline + 1, closingFence).trim();
            }
        }
        return json;
    }

    private void validateSkillPlan(Map<String, Object> plan,
            List<RecommendationScoresRequest.ScoreDto> scores) {
        if (plan == null || !(plan.get("overview") instanceof String overview) || overview.isBlank()
                || !(plan.get("weeklyPlan") instanceof List<?> weeks) || weeks.size() != 4
                || !(plan.get("recommendations") instanceof List<?> recommendations)
                || recommendations.size() != scores.size()) {
            throw new IllegalArgumentException("Gemini response did not match the learning plan format.");
        }

        java.util.Set<Integer> plannedWeeks = new java.util.HashSet<>();
        for (Object weekValue : weeks) {
            if (!(weekValue instanceof Map<?, ?> week)
                    || !(week.get("week") instanceof Number)
                    || !hasText(week.get("topic")) || !hasText(week.get("focus"))
                    || !hasText(week.get("successCheck")) || !isStringList(week.get("tasks"))
                    || !(week.get("resource") instanceof Map<?, ?> resource)) {
                throw new IllegalArgumentException("Gemini response contained an incomplete weekly plan.");
            }
            plannedWeeks.add(((Number) week.get("week")).intValue());
            validateResource(resource, false);
        }
        if (!plannedWeeks.equals(java.util.Set.of(1, 2, 3, 4))) {
            throw new IllegalArgumentException("Gemini response did not include weeks 1 through 4 exactly once.");
        }

        Map<String, RecommendationScoresRequest.ScoreDto> scoresByTopic = new HashMap<>();
        for (RecommendationScoresRequest.ScoreDto score : scores) {
            if (scoresByTopic.put(score.getTopic(), score) != null) {
                throw new IllegalArgumentException("Assessment topics must be unique.");
            }
        }
        List<String> recommendedTopics = new java.util.ArrayList<>();
        for (Object recommendationValue : recommendations) {
            if (!(recommendationValue instanceof Map<?, ?> recommendation)
                    || !hasText(recommendation.get("topic"))
                    || !(recommendation.get("right") instanceof Number)
                    || !(recommendation.get("total") instanceof Number)
                    || !(recommendation.get("target") instanceof Number)
                    || !hasText(recommendation.get("priority"))
                    || !hasText(recommendation.get("gapSummary"))
                    || !isStringList(recommendation.get("steps"))
                    || !isNonEmptyList(recommendation.get("resources"))) {
                throw new IllegalArgumentException("Gemini response contained an incomplete skill recommendation.");
            }
            String topic = recommendation.get("topic").toString();
            recommendedTopics.add(topic);
            RecommendationScoresRequest.ScoreDto score = scoresByTopic.get(topic);
            if (score == null
                    || ((Number) recommendation.get("right")).intValue() != score.getRight()
                    || ((Number) recommendation.get("total")).intValue() != score.getTotal()
                    || ((Number) recommendation.get("target")).intValue() != score.getTarget()) {
                throw new IllegalArgumentException("Gemini response changed an assessment score.");
            }
            String expectedPriority = score.getRight() >= score.getTarget()
                    ? "Stretch" : score.getRight() == 0 ? "High" : "Medium";
            if (!expectedPriority.equals(recommendation.get("priority"))) {
                throw new IllegalArgumentException("Gemini response returned an invalid skill priority.");
            }
            for (Object resourceValue : (List<?>) recommendation.get("resources")) {
                if (!(resourceValue instanceof Map<?, ?> resource)) {
                    throw new IllegalArgumentException("Gemini response contained an invalid resource.");
                }
                validateResource(resource, true);
            }
        }
        if (recommendedTopics.size() != new java.util.HashSet<>(recommendedTopics).size()
                || scores.stream().anyMatch(score -> !recommendedTopics.contains(score.getTopic()))) {
            throw new IllegalArgumentException("Gemini response did not include each assessment topic exactly once.");
        }
    }

    private void validateResource(Map<?, ?> resource, boolean includeDetails) {
        if (!hasText(resource.get("title")) || !hasText(resource.get("url"))) {
            throw new IllegalArgumentException("Gemini response contained an incomplete resource.");
        }
        URI uri = URI.create(resource.get("url").toString());
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null) {
            throw new IllegalArgumentException("Gemini response contained an invalid resource URL.");
        }
        if (includeDetails && (!hasText(resource.get("level")) || !hasText(resource.get("source"))
                || !hasText(resource.get("reason")) || !(resource.get("hours") instanceof Number))) {
            throw new IllegalArgumentException("Gemini response contained incomplete resource details.");
        }
    }

    private boolean hasText(Object value) {
        return value instanceof String text && !text.isBlank();
    }

    private boolean isNonEmptyList(Object value) {
        return value instanceof List<?> list && !list.isEmpty();
    }

    private boolean isStringList(Object value) {
        return value instanceof List<?> list && !list.isEmpty()
                && list.stream().allMatch(item -> item instanceof String text && !text.isBlank());
    }

    private static String configuredValue(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) value = System.getProperty(name);
        return value;
    }

    private static String firstConfiguredValue(String first, String second, String fallback) {
        String value = configuredValue(first);
        if (value == null || value.isBlank()) value = configuredValue(second);
        return value == null || value.isBlank() ? fallback : value;
    }

    public String generateTrainingRecommendations(RecommendationRequest request) {
        if (apiKey == null || apiKey.isEmpty()) {
            return "Error: GEMINI_API_KEY is not configured in environment variables.";
        }

        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + apiKey;

        // Build a detailed prompt for Gemini based on skill gaps
        StringBuilder promptBuilder = new StringBuilder();
        promptBuilder.append("Act as an expert Corporate L&D (Learning and Development) AI assistant. ")
                     .append("Analyze the following skill gaps for employee ").append(request.getEmployeeName())
                     .append(" working as a ").append(request.getRole()).append(":\n\n");

        for (RecommendationRequest.SkillGapDto gap : request.getSkillGaps()) {
            promptBuilder.append("- Skill: ").append(gap.getSkillName())
                         .append(" | Current Level: ").append(gap.getCurrentLevel())
                         .append(" | Required Level: ").append(gap.getRequiredLevel())
                         .append(" | Gap Score: ").append(gap.getGapScore()).append("\n");
        }

        promptBuilder.append("\nProvide personalized training program recommendations, ")
                     .append("suggesting specific learning paths, internal courses, or external resources ")
                     .append("(like Coursera, Udemy, or LinkedIn Learning) to bridge these gaps. ")
                     .append("Format the response clearly with bullet points and action items.");

        // Construct the JSON payload required by Google Gemini API
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> part = new HashMap<>();
        part.put("text", promptBuilder.toString());

        Map<String, Object> content = new HashMap<>();
        content.put("parts", List.of(part));

        Map<String, Object> body = new HashMap<>();
        body.put("contents", List.of(content));

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            
            // Parse Gemini's response JSON structure
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map responseBody = response.getBody();
                List<Map> candidates = (List<Map>) responseBody.get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map contentMap = (Map) candidates.get(0).get("content");
                    List<Map> partsList = (List<Map>) contentMap.get("parts");
                    if (partsList != null && !partsList.isEmpty()) {
                        return (String) partsList.get(0).get("text");
                    }
                }
            }
            return "Could not extract recommendation from Gemini response.";
        } catch (Exception e) {
            return "Error communicating with Gemini API: " + e.getMessage();
        }
    }
}
