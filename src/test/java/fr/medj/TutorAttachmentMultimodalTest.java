package fr.medj;

import fr.medj.controller.GeminiAiController;
import fr.medj.model.AiTutorMessage;
import fr.medj.model.TutorAttachment;
import fr.medj.model.TutorConversationThread;
import fr.medj.service.*;
import io.micronaut.core.io.buffer.ReadBufferFactory;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.MediaType;
import io.micronaut.http.multipart.CompletedFileUpload;
import io.micronaut.http.multipart.FormFieldMetadata;
import io.micronaut.serde.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

public class TutorAttachmentMultimodalTest {

    private FirestoreService firestoreService;
    private StorageService storageService;
    private GeminiMedicalService geminiMedicalService;
    private GeminiAiController geminiAiController;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        firestoreService = new FirestoreService();
        firestoreService.init();
        firestoreService.seedSampleData();

        storageService = new StorageService("./build/test-storage-tutor-" + System.currentTimeMillis());

        MedicalQcmTools medicalQcmTools = new MedicalQcmTools(firestoreService);
        MedicalIllustrationTools medicalIllustrationTools = new MedicalIllustrationTools(firestoreService, storageService);
        MedicalFlashcardTools medicalFlashcardTools = new MedicalFlashcardTools(firestoreService);
        objectMapper = ObjectMapper.getDefault();

        geminiMedicalService = new GeminiMedicalService(
            objectMapper,
            firestoreService,
            medicalQcmTools,
            medicalIllustrationTools,
            medicalFlashcardTools,
            storageService
        );
        geminiMedicalService.init();

        geminiAiController = new GeminiAiController(geminiMedicalService, firestoreService, storageService);
    }

    private CompletedFileUpload createUpload(String filename, byte[] bytes, String contentType) {
        return CompletedFileUpload.ofMemory(
            new FormFieldMetadata("file", filename, MediaType.of(contentType)),
            ReadBufferFactory.getJdkFactory().adapt(bytes)
        );
    }

    @Test
    void testUploadTutorAttachmentImage() throws IOException {
        byte[] fakePng = new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13};
        CompletedFileUpload upload = createUpload("schema_anatomie_coeur.png", fakePng, "image/png");

        HttpResponse<TutorAttachment> response = geminiAiController.uploadTutorAttachment(upload);
        assertEquals(HttpStatus.OK, response.getStatus());

        TutorAttachment attachment = response.body();
        assertNotNull(attachment);
        assertNotNull(attachment.id());
        assertEquals("schema_anatomie_coeur.png", attachment.filename());
        assertEquals("image/png", attachment.mimeType());
        assertTrue(attachment.storageUrl().startsWith("/api/storage/"));
        assertEquals(fakePng.length, attachment.fileSize());

        byte[] readBack = storageService.readFileBytes(attachment.storageUrl());
        assertArrayEquals(fakePng, readBack);
    }

    @Test
    void testUploadTutorAttachmentPdf() throws IOException {
        byte[] fakePdf = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF".getBytes(StandardCharsets.UTF_8);
        CompletedFileUpload upload = createUpload("polycopie_ue5.pdf", fakePdf, "application/pdf");

        HttpResponse<TutorAttachment> response = geminiAiController.uploadTutorAttachment(upload);
        assertEquals(HttpStatus.OK, response.getStatus());

        TutorAttachment attachment = response.body();
        assertNotNull(attachment);
        assertEquals("polycopie_ue5.pdf", attachment.filename());
        assertEquals("application/pdf", attachment.mimeType());
        assertTrue(attachment.storageUrl().startsWith("/api/storage/"));
    }

    @Test
    void testAskTutorWithAttachmentPersistedInThread() throws IOException {
        // 1. Upload a file
        byte[] txtBytes = "Notes de révision: L'artère coronaire gauche donne l'interventriculaire antérieure.".getBytes(StandardCharsets.UTF_8);
        CompletedFileUpload upload = createUpload("notes_cardiologie.txt", txtBytes, "text/plain");
        HttpResponse<TutorAttachment> uploadRes = geminiAiController.uploadTutorAttachment(upload);
        TutorAttachment attachment = uploadRes.body();
        assertNotNull(attachment);

        // 2. Ask tutor with attachment and question
        GeminiAiController.AskTutorRequest req = new GeminiAiController.AskTutorRequest(
            null,
            "Peux-tu m'expliquer ce point d'anatomie ?",
            "UE5 Anatomie Cardiaque",
            "course-ue5-01",
            "Anatomie du Cœur",
            List.of(attachment)
        );

        HttpResponse<Map<String, Object>> tutorRes = geminiAiController.askTutor(req);
        assertEquals(HttpStatus.OK, tutorRes.getStatus());
        Map<String, Object> body = tutorRes.body();
        assertNotNull(body);

        String threadId = (String) body.get("threadId");
        assertNotNull(threadId);

        // 3. Verify thread messages in Firestore
        Optional<TutorConversationThread> threadOpt = firestoreService.getTutorThread(threadId);
        assertTrue(threadOpt.isPresent());
        TutorConversationThread thread = threadOpt.get();
        assertEquals(2, thread.messages().size());

        AiTutorMessage userMsg = thread.messages().get(0);
        assertEquals("user", userMsg.role());
        assertNotNull(userMsg.attachments());
        assertEquals(1, userMsg.attachments().size());
        assertEquals("notes_cardiologie.txt", userMsg.attachments().get(0).filename());
    }

    @Test
    void testAskTutorWithEmptyQuestionButAttachmentDefaultsGracefully() throws IOException {
        byte[] imgBytes = new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};
        CompletedFileUpload upload = createUpload("schema_plexus.png", imgBytes, "image/png");
        HttpResponse<TutorAttachment> uploadRes = geminiAiController.uploadTutorAttachment(upload);
        TutorAttachment attachment = uploadRes.body();
        assertNotNull(attachment);

        // User sent message with attachment without typing question
        GeminiAiController.AskTutorRequest req = new GeminiAiController.AskTutorRequest(
            null,
            "",
            "UE5 Plexus Brachial",
            "course-ue5-07",
            "Plexus Brachial",
            List.of(attachment)
        );

        HttpResponse<Map<String, Object>> tutorRes = geminiAiController.askTutor(req);
        assertEquals(HttpStatus.OK, tutorRes.getStatus());
        assertNotNull(tutorRes.body().get("answer"));
    }

    @Test
    void testSerdeAiTutorMessageWithAttachments() throws IOException {
        TutorAttachment attachment = new TutorAttachment("att-1", "doc.pdf", "application/pdf", "/api/storage/doc.pdf", 1024L);
        AiTutorMessage msg = new AiTutorMessage(
            "msg-1",
            "user",
            "Voici mon cours",
            "c-1",
            "Biochimie",
            LocalDateTime.now(),
            List.of(attachment)
        );

        String json = objectMapper.writeValueAsString(msg);
        assertNotNull(json);
        assertTrue(json.contains("doc.pdf"));
        assertTrue(json.contains("application/pdf"));

        AiTutorMessage parsed = objectMapper.readValue(json, AiTutorMessage.class);
        assertNotNull(parsed);
        assertEquals("msg-1", parsed.id());
        assertNotNull(parsed.attachments());
        assertEquals(1, parsed.attachments().size());
        assertEquals("doc.pdf", parsed.attachments().get(0).filename());
    }

    @Test
    void testLangChain4jMultimodalClasses() {
        dev.langchain4j.data.message.TextContent textContent = dev.langchain4j.data.message.TextContent.from("hello");
        byte[] fakePng = new byte[]{(byte) 0x89, 'P', 'N', 'G'};
        String b64 = java.util.Base64.getEncoder().encodeToString(fakePng);
        dev.langchain4j.data.message.ImageContent imageContent = dev.langchain4j.data.message.ImageContent.from(b64, "image/png");
        dev.langchain4j.data.message.PdfFileContent pdfContent = dev.langchain4j.data.message.PdfFileContent.from(b64);
        dev.langchain4j.data.message.UserMessage userMessage = dev.langchain4j.data.message.UserMessage.from(textContent, imageContent, pdfContent);
        assertNotNull(userMessage);

        dev.langchain4j.model.chat.ChatModel mockModel = org.mockito.Mockito.mock(dev.langchain4j.model.chat.ChatModel.class);
        org.mockito.Mockito.when(mockModel.chat(org.mockito.ArgumentMatchers.any(dev.langchain4j.model.chat.request.ChatRequest.class)))
            .thenReturn(dev.langchain4j.model.chat.response.ChatResponse.builder()
                .aiMessage(dev.langchain4j.data.message.AiMessage.from("Reponse mockée"))
                .build());

        PassTutorAiService service = dev.langchain4j.service.AiServices.builder(PassTutorAiService.class)
            .chatModel(mockModel)
            .build();
        assertNotNull(service);

        dev.langchain4j.service.Result<String> res = service.chat(userMessage);
        assertNotNull(res);
        assertEquals("Reponse mockée", res.content());
    }
}
