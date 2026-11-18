package com.knowledgegap.backend.config;

import com.knowledgegap.backend.security.StompAuthInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Real-time "push" channel for the chat.
 *
 * Design: messages are SENT through the normal REST API (/api/chat/...), where every call is
 * checked against the logged-in user. The WebSocket is only used by the SERVER to tell a user
 * "something new is waiting for you". Clients are not allowed to publish anything.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompAuthInterceptor authInterceptor;
    private final String[] allowedOriginPatterns;

    public WebSocketConfig(StompAuthInterceptor authInterceptor,
            @Value("${app.ws.allowed-origin-patterns:http://localhost:*,http://127.0.0.1:*}")
            String[] allowedOriginPatterns) {
        this.authInterceptor = authInterceptor;
        this.allowedOriginPatterns = allowedOriginPatterns;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Per-user queues only: a client subscribes to /user/queue/chat and Spring maps that to
        // the queue of the authenticated principal, so users can never read each other's queue.
        registry.enableSimpleBroker("/queue");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOriginPatterns(allowedOriginPatterns);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(authInterceptor);
    }
}
