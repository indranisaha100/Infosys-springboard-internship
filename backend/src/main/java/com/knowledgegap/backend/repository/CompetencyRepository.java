package com.knowledgegap.backend.repository;

import com.knowledgegap.backend.model.Competency;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CompetencyRepository extends JpaRepository<Competency, Long> {
    List<Competency> findByActiveTrueOrderByNameAsc();
}
