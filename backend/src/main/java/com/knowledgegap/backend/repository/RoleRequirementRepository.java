package com.knowledgegap.backend.repository;

import com.knowledgegap.backend.model.RoleRequirement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RoleRequirementRepository extends JpaRepository<RoleRequirement, Long> {
    List<RoleRequirement> findAllByOrderByRoleNameAsc();
}
