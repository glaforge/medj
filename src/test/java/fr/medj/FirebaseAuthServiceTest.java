package fr.medj;

import fr.medj.service.FirebaseAuthService;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@MicronautTest
public class FirebaseAuthServiceTest {

    @Inject
    FirebaseAuthService authService;

    @Test
    @DisplayName("Email allowlist recognizes admin and allowed students")
    void testEmailAllowlist() {
        assertTrue(authService.isEmailAllowed("glaforge@gmail.com"));
        assertTrue(authService.isEmailAllowed("GLAFORGE@GMAIL.COM "));
        assertTrue(authService.isEmailAllowed("marionlaforge4@gmail.com"));
        assertTrue(authService.isEmailAllowed("MARIONLAFORGE4@GMAIL.COM"));
        
        assertFalse(authService.isEmailAllowed("student@pariscite.fr"));
        assertFalse(authService.isEmailAllowed("hacker@unknown.com"));
        assertFalse(authService.isEmailAllowed(""));
        assertFalse(authService.isEmailAllowed(null));
    }

    @Test
    @DisplayName("Test token parsing in mock mode")
    void testMockTokenVerification() {
        Optional<FirebaseAuthService.AuthenticatedUser> allowedUser = authService.verifyToken("test-token-glaforge@gmail.com");
        assertTrue(allowedUser.isPresent());
        assertEquals("glaforge@gmail.com", allowedUser.get().email());
        assertTrue(allowedUser.get().isAllowed());
        assertTrue(allowedUser.get().isAdmin());

        Optional<FirebaseAuthService.AuthenticatedUser> forbiddenUser = authService.verifyToken("test-token-random@gmail.com");
        assertTrue(forbiddenUser.isPresent());
        assertEquals("random@gmail.com", forbiddenUser.get().email());
        assertFalse(forbiddenUser.get().isAllowed());
        assertFalse(forbiddenUser.get().isAdmin());
    }
}
