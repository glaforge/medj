package fr.medj.controller;

import fr.medj.service.FirebaseAuthService;
import io.micronaut.core.async.publisher.Publishers;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.MutableHttpResponse;
import io.micronaut.http.annotation.Filter;
import io.micronaut.http.filter.HttpServerFilter;
import io.micronaut.http.filter.ServerFilterChain;
import org.reactivestreams.Publisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Filter("/api/**")
public class FirebaseAuthFilter implements HttpServerFilter {
    private static final Logger LOG = LoggerFactory.getLogger(FirebaseAuthFilter.class);

    public static final String USER_ATTRIBUTE = "MEDJ_AUTH_USER";

    private final FirebaseAuthService firebaseAuthService;

    // Endpoints that do not require authentication (e.g. iCal subscription feed)
    private static final Set<String> PUBLIC_EXEMPT_PATHS = Set.of(
        "/api/calendar/feed.ics"
    );

    public FirebaseAuthFilter(FirebaseAuthService firebaseAuthService) {
        this.firebaseAuthService = firebaseAuthService;
    }

    @Override
    public Publisher<MutableHttpResponse<?>> doFilter(HttpRequest<?> request, ServerFilterChain chain) {
        if (!firebaseAuthService.isSecurityEnabled()) {
            return chain.proceed(request);
        }

        String path = request.getPath();

        // Handle exempt paths (public iCal feed and binary media/images loaded by browser)
        if (path.startsWith("/api/storage/") || PUBLIC_EXEMPT_PATHS.contains(path)) {
            return chain.proceed(request);
        }

        // Allow CORS pre-flight OPTIONS requests
        if (request.getMethod().name().equalsIgnoreCase("OPTIONS")) {
            return chain.proceed(request);
        }

        String authHeader = request.getHeaders().get("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            LOG.warn("Unauthorized request to {} without Bearer token from {}", path, request.getRemoteAddress());
            return Publishers.just(
                HttpResponse.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                        "error", "UNAUTHORIZED",
                        "message", "Authentification requise pour accéder à l'application MedJ."
                    ))
            );
        }

        String token = authHeader.substring("Bearer ".length()).trim();
        Optional<FirebaseAuthService.AuthenticatedUser> userOpt = firebaseAuthService.verifyToken(token);

        if (userOpt.isEmpty()) {
            LOG.warn("Invalid or expired token for request to {}", path);
            return Publishers.just(
                HttpResponse.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                        "error", "INVALID_TOKEN",
                        "message", "Jeton d'authentification invalide ou expiré."
                    ))
            );
        }

        FirebaseAuthService.AuthenticatedUser user = userOpt.get();
        if (!user.isAllowed()) {
            LOG.warn("Forbidden access attempt by non-whitelisted email '{}' to {}", user.email(), path);
            return Publishers.just(
                HttpResponse.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                        "error", "FORBIDDEN_USER",
                        "email", user.email(),
                        "message", "Votre adresse email (" + user.email() + ") n'est pas autorisée à accéder à cette instance MedJ."
                    ))
            );
        }

        request.setAttribute(USER_ATTRIBUTE, user);
        return chain.proceed(request);
    }
}
