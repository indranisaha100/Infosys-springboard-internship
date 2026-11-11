package com.knowledgegap.backend.repository;

import com.knowledgegap.backend.model.GeneratedSkillProgram;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GeneratedSkillProgramRepository extends JpaRepository<GeneratedSkillProgram, Long> {
    List<GeneratedSkillProgram> findAllByOrderByCreatedAtDesc();

    Optional<GeneratedSkillProgram> findFirstByEmployeeIdAndCompetencyIgnoreCaseAndStatusOrderByCreatedAtDesc(
            Long employeeId, String competency, String status);
}
