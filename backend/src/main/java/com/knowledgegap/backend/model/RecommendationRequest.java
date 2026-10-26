package com.knowledgegap.backend.model;

import lombok.Data;
import java.util.List;

@Data
public class RecommendationRequest {
    private String employeeName;
    private String role;
    private List<SkillGapDto> skillGaps;

    @Data
    public static class SkillGapDto {
        private String skillName;
        private int currentLevel; // e.g., 2 (Beginner)
        private int requiredLevel; // e.g., 4 (Advanced)
        private int gapScore; // Calculated difference (required - current)
    }
}