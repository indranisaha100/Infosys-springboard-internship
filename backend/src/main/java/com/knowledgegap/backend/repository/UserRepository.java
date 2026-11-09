package com.knowledgegap.backend.repository;

import com.knowledgegap.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    Optional<User> findByUserIdIgnoreCase(String userId);

    boolean existsByUserId(String userId);

    List<User> findByStatusOrderByIdAsc(String status);

    List<User> findByRole(String role);
}
