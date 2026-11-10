package com.knowledgegap.backend.security;

import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class UserPasswordMigration implements CommandLineRunner {

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  public UserPasswordMigration(UserRepository userRepository, PasswordEncoder passwordEncoder) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
  }

  @Override
  public void run(String... args) {
    for (User user : userRepository.findAll()) {
      boolean changed = false;
      if (user.getPassword() != null && !isBcryptHash(user.getPassword())) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        changed = true;
      }
      if (user.getRole() == null || user.getRole().isBlank()) {
        user.setRole("ROLE_EMPLOYEE");
        changed = true;
      }
      // Rows created before the approval workflow were active accounts.
      if (user.getStatus() == null || user.getStatus().isBlank()) {
        user.setStatus("APPROVED");
        changed = true;
      }
      if (user.getUserId() == null || user.getUserId().isBlank()) {
        user.setUserId(userIdFor(user));
        changed = true;
      }
      if (changed) {
        userRepository.save(user);
      }
    }
  }

  private boolean isBcryptHash(String password) {
    return password.startsWith("$2a$")
        || password.startsWith("$2b$")
        || password.startsWith("$2y$");
  }

  private String userIdFor(User user) {
    String prefix = switch (user.getRole()) {
      case "ROLE_HR", "ROLE_ADMIN" -> "HR";
      case "ROLE_MANAGER" -> "MGR";
      case "ROLE_MENTOR" -> "MEN";
      case "ROLE_DEPARTMENT_HEAD" -> "DH";
      default -> "EMP";
    };
    return prefix + String.format("%06d", user.getId());
  }
}
