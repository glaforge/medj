package fr.medj.model;

import io.micronaut.serde.annotation.Serdeable;

import java.net.URI;

@Serdeable
public record GroundingSource(
    String title,
    String uri,
    String domain
) {
    public GroundingSource {
        if ((domain == null || domain.isBlank()) && uri != null) {
            domain = extractDomain(uri);
        }
    }

    public GroundingSource(String title, String uri) {
        this(title, uri, extractDomain(uri));
    }

    private static String extractDomain(String uri) {
        if (uri == null || uri.isBlank()) return "";
        try {
            URI u = new URI(uri);
            String host = u.getHost();
            return host != null ? host.replaceFirst("^www\\.", "") : "";
        } catch (Exception e) {
            return "";
        }
    }
}
