package com.knowledgegap.backend.controller;


import com.knowledgegap.backend.model.RecommendationRequest;
import com.knowledgegap.backend.service.GeminiRecommendationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recommendations")
@CrossOrigin(origins = "http://localhost:3000")
public class RecommendationController {

    @Autowired
    private GeminiRecommendationService geminiService;

    @PostMapping("/generate")
    public ResponseEntity<String> getAiRecommendations(@RequestBody RecommendationRequest request) {
        String recommendations = geminiService.generateTrainingRecommendations(request);
        return ResponseEntity.ok(recommendations);
    }
}