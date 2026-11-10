package com.knowledgegap.backend.security;

import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.UserRepository;
import org.springframework.stereotype.Component;
import java.util.Optional;

@Component
public class CurrentUser {
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;

    public CurrentUser(UserRepository userRepository, JwtTokenProvider jwtTokenProvider) {
        this.userRepository = userRepository;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    public Optional<User> from(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) return Optional.empty();
        String token = authorization.substring(7);
        if (!jwtTokenProvider.validateToken(token)) return Optional.empty();
        return userRepository.findByEmail(jwtTokenProvider.getEmailFromJWT(token));
    }

    public String displayName(User user) {
        String first = user.getFirstName() == null ? "" : user.getFirstName();
        String last = user.getLastName() == null ? "" : user.getLastName();
        String name = (first + " " + last).trim();
        return name.isBlank() ? user.getEmail() : name;
    }
}
