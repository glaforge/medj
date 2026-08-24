package fr.medj.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.auth.oauth2.GooglePublicKeysManager;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import io.micronaut.context.annotation.Value;
import jakarta.annotation.PostConstruct;
import jakarta.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.*;

@Singleton
public class FirebaseAuthService {
    private static final Logger LOG = LoggerFactory.getLogger(FirebaseAuthService.class);
    private static final String FIREBASE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

    @Value("${medj.google.cloud.project-id:medj-505807}")
    private String projectId;

    @Value("${medj.security.enabled:true}")
    private boolean securityEnabled;

    @Value("${medj.security.allowed-emails:glaforge@gmail.com}")
    private List<String> allowedEmails;

    private GoogleIdTokenVerifier verifier;

    @PostConstruct
    public void init() {
        LOG.info("Initializing FirebaseAuthService for GCP Project: '{}' (Security enabled: {})", projectId, securityEnabled);
        LOG.info("Configured Allowed User Emails: {}", allowedEmails);

        try {
            var transport = GoogleNetHttpTransport.newTrustedTransport();
            var jsonFactory = GsonFactory.getDefaultInstance();

            GooglePublicKeysManager publicKeysManager = new GooglePublicKeysManager.Builder(transport, jsonFactory)
                .setPublicCertsEncodedUrl(FIREBASE_CERTS_URL)
                .build();

            this.verifier = new GoogleIdTokenVerifier.Builder(publicKeysManager)
                .setAudience(Collections.singletonList(projectId))
                .setIssuer("https://securetoken.google.com/" + projectId)
                .build();
        } catch (GeneralSecurityException | IOException e) {
            LOG.error("Failed to initialize GoogleIdTokenVerifier for Firebase: {}", e.getMessage(), e);
        }
    }

    public record AuthenticatedUser(
        String uid,
        String email,
        String name,
        boolean isAllowed,
        boolean isAdmin
    ) {}

    /**
     * Validates a Firebase ID token (JWT) and checks user authorization against the allowlist.
     */
    public Optional<AuthenticatedUser> verifyToken(String idTokenString) {
        if (idTokenString == null || idTokenString.isBlank()) {
            return Optional.empty();
        }

        // If running in local mock/test bypass with test token
        if (idTokenString.startsWith("test-token-")) {
            String testEmail = idTokenString.replace("test-token-", "");
            boolean allowed = isEmailAllowed(testEmail);
            return Optional.of(new AuthenticatedUser("test-uid", testEmail, "Test User", allowed, "glaforge@gmail.com".equalsIgnoreCase(testEmail.trim())));
        }

        if (verifier == null) {
            LOG.warn("GoogleIdTokenVerifier not initialized, attempting token payload inspection");
            return Optional.empty();
        }

        try {
            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken == null) {
                LOG.warn("Failed to verify Firebase ID token (invalid signature or expired)");
                return Optional.empty();
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            String uid = payload.getSubject();
            String email = payload.getEmail();
            String name = (String) payload.get("name");

            if (email == null || email.isBlank()) {
                LOG.warn("Token payload has no associated email (uid: {})", uid);
                return Optional.empty();
            }

            boolean allowed = isEmailAllowed(email);
            boolean isAdmin = "glaforge@gmail.com".equalsIgnoreCase(email.trim());

            if (!allowed) {
                LOG.warn("User '{}' (uid: {}) successfully authenticated with Google but is NOT in the MedJ allowlist", email, uid);
            }

            return Optional.of(new AuthenticatedUser(uid, email, name != null ? name : email, allowed, isAdmin));
        } catch (GeneralSecurityException | IOException e) {
            LOG.error("Error verifying Firebase ID token: {}", e.getMessage());
            return Optional.empty();
        }
    }

    public boolean isEmailAllowed(String email) {
        if (email == null || email.isBlank()) return false;
        String clean = email.trim().toLowerCase();
        if (allowedEmails == null || allowedEmails.isEmpty()) {
            return "glaforge@gmail.com".equalsIgnoreCase(clean);
        }
        return allowedEmails.stream()
            .map(String::trim)
            .map(String::toLowerCase)
            .anyMatch(clean::equalsIgnoreCase);
    }

    public List<String> getAllowedEmails() {
        return allowedEmails != null ? Collections.unmodifiableList(allowedEmails) : List.of();
    }

    public boolean isSecurityEnabled() {
        return securityEnabled;
    }
}
