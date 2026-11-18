package com.knowledgegap.backend.security;

import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.UserRepository;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * Authenticates every WebSocket connection with the same JWT the REST API uses, and locks the
 * socket down so a user can only ever listen to their own queue.
 *
 *  - CONNECT   : needs "Authorization: Bearer <jwt>" in the STOMP headers; the principal name
 *                becomes the user's e-mail (the same key the chat tables use).
 *  - SUBSCRIBE : only "/user/queue/..." is allowed (Spring resolves it to the caller's own queue).
 *  - SEND      : always rejected. Messages are sent through the REST API instead.
 */
@Component
public class StompAuthInterceptor implements ChannelInterceptor {

    private static final String OWN_QUEUE_PREFIX = "/user/queue/";

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository users;

    public StompAuthInterceptor(JwtTokenProvider jwtTokenProvider, UserRepository users) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.users = users;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }
        StompCommand command = accessor.getCommand();

        if (StompCommand.CONNECT.equals(command) || StompCommand.STOMP.equals(command)) {
            User user = authenticate(accessor.getFirstNativeHeader("Authorization"));
            accessor.setUser(new UsernamePasswordAuthenticationToken(
                    user.getEmail(), null, List.of(new SimpleGrantedAuthority(user.getRole()))));
        } else if (StompCommand.SUBSCRIBE.equals(command)) {
            String destination = accessor.getDestination();
            if (accessor.getUser() == null || destination == null || !destination.startsWith(OWN_QUEUE_PREFIX)) {
                throw new MessagingException("Subscription not allowed.");
            }
        } else if (StompCommand.SEND.equals(command)) {
            throw new MessagingException("Clients cannot publish to the socket. Use the REST API.");
        }
        return message;
    }

    private User authenticate(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new MessagingException("Missing authentication token.");
        }
        String token = authorization.substring(7).trim();
        if (!jwtTokenProvider.validateToken(token)) {
            throw new MessagingException("Invalid or expired token.");
        }
        Optional<User> user;
        try {
            user = users.findByEmail(jwtTokenProvider.getEmailFromJWT(token));
        } catch (RuntimeException exception) {
            user = Optional.empty();
        }
        return user
                .filter(u -> "ROLE_EMPLOYEE".equals(u.getRole()) || "ROLE_MENTOR".equals(u.getRole()))
                .orElseThrow(() -> new MessagingException("Chat is only available to employees and mentors."));
    }
}
