package com.knowledgegap.backend.repository;

import com.knowledgegap.backend.model.TrainingProgramme;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TrainingProgrammeRepository extends JpaRepository<TrainingProgramme, Long> {
    List<TrainingProgramme> findAllByOrderByStartDateAsc();
}
