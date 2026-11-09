package com.knowledgegap.backend.repository;

import com.knowledgegap.backend.model.LearningResource;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LearningResourceRepository extends JpaRepository<LearningResource, Long> {
    List<LearningResource> findByActiveTrueOrderByTitleAsc();
}
