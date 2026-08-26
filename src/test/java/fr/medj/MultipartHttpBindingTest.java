package fr.medj;

import fr.medj.model.Course;
import fr.medj.model.QcmQuestion;
import fr.medj.service.FirestoreService;
import io.micronaut.core.type.Argument;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MediaType;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.http.client.multipart.MultipartBody;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@MicronautTest
public class MultipartHttpBindingTest {

    @Inject
    @Client("/")
    HttpClient client;

    @Inject
    FirestoreService firestoreService;

    @BeforeEach
    void setUp() {
        firestoreService.seedSampleData();
    }

    @Test
    void testMultipartMultipleFilesUpload() {
        String courseId = "course-ue1-01";
        Course courseBefore = firestoreService.getCourse(courseId).orElseThrow();
        int initialDocCount = courseBefore.documents() != null ? courseBefore.documents().size() : 0;

        MultipartBody body = MultipartBody.builder()
            .addPart("files", "page1.png", MediaType.IMAGE_PNG_TYPE, "content1".getBytes())
            .addPart("files", "page2.png", MediaType.IMAGE_PNG_TYPE, "content2".getBytes())
            .addPart("files", "page3.png", MediaType.IMAGE_PNG_TYPE, "content3".getBytes())
            .addPart("file", "page1.png", MediaType.IMAGE_PNG_TYPE, "content1".getBytes())
            .build();

        HttpRequest<?> request = HttpRequest.POST("/api/gemini/scan-handwritten?courseId=" + courseId, body)
            .contentType(MediaType.MULTIPART_FORM_DATA_TYPE);

        HttpResponse<Map> response = client.toBlocking().exchange(request, Map.class);
        assertEquals(200, response.status().getCode());
        Map responseBody = response.body();
        assertNotNull(responseBody);
        List<String> imageUrls = (List<String>) responseBody.get("imageUrls");
        assertEquals(3, imageUrls != null ? imageUrls.size() : 0, "Expected 3 image URLs");

        Course courseAfter = firestoreService.getCourse(courseId).orElseThrow();
        assertEquals(initialDocCount + 3, courseAfter.documents().size(), "All 3 files must be attached to the course");
    }

    @Test
    void testMultipartMultipleFilesAnnaleScan() {
        String courseId = "course-ue2-01";
        Course courseBefore = firestoreService.getCourse(courseId).orElseThrow();
        int initialDocCount = courseBefore.documents() != null ? courseBefore.documents().size() : 0;

        MultipartBody body = MultipartBody.builder()
            .addPart("files", "annale_p1.pdf", MediaType.APPLICATION_PDF_TYPE, "pdf1".getBytes())
            .addPart("files", "annale_p2.pdf", MediaType.APPLICATION_PDF_TYPE, "pdf2".getBytes())
            .build();

        HttpRequest<?> request = HttpRequest.POST("/api/gemini/scan-annale?courseId=" + courseId, body)
            .contentType(MediaType.MULTIPART_FORM_DATA_TYPE);

        HttpResponse<List<QcmQuestion>> response = client.toBlocking().exchange(request, Argument.listOf(QcmQuestion.class));
        assertEquals(200, response.status().getCode());

        Course courseAfter = firestoreService.getCourse(courseId).orElseThrow();
        assertEquals(initialDocCount + 2, courseAfter.documents().size(), "All 2 annale files must be attached to the course");
    }
}
