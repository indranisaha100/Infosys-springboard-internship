package com.knowledgegap.backend.model;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
public class RecommendationScoresRequest {
    private List<ScoreDto> scores;

    @Data
    @NoArgsConstructor
    public static class ScoreDto {
        private String topic;
        private int right;
        private int total;
        private int target;
    }
}
