package fr.medj.controller;

import io.micronaut.core.io.ResourceResolver;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.server.types.files.StreamedFile;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;

import java.io.InputStream;
import java.util.Optional;

@Secured(SecurityRule.IS_ANONYMOUS)
@Controller
public class SpaFallbackController {

    private final ResourceResolver resourceResolver;

    public SpaFallbackController(ResourceResolver resourceResolver) {
        this.resourceResolver = resourceResolver;
    }

    @Get(value = "/{path:(?!api|uploads|assets|favicon\\.ico)[^\\.]*}", produces = MediaType.TEXT_HTML)
    public HttpResponse<StreamedFile> forwardRoot(@PathVariable String path) {
        return serveIndex();
    }

    @Get(value = "/{path1:(?!api|uploads|assets)[^\\.]*}/{path2:[^\\.]*}", produces = MediaType.TEXT_HTML)
    public HttpResponse<StreamedFile> forwardNested(@PathVariable String path1, @PathVariable String path2) {
        return serveIndex();
    }

    private HttpResponse<StreamedFile> serveIndex() {
        Optional<InputStream> is = resourceResolver.getResourceAsStream("classpath:public/index.html");
        if (is.isPresent()) {
            return HttpResponse.ok(new StreamedFile(is.get(), MediaType.TEXT_HTML_TYPE));
        }
        return HttpResponse.notFound();
    }
}
