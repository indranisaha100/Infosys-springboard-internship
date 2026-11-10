package com.knowledgegap.backend.repository;

import com.knowledgegap.backend.model.LearningPath;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LearningPathRepository extends JpaRepository<LearningPath, Long> {
    List<LearningPath> findByActiveTrueOrderByNameAsc();
}
