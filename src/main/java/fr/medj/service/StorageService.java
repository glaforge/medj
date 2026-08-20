package fr.medj.service;

import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import io.micronaut.context.annotation.Value;
import jakarta.annotation.PostConstruct;
import jakarta.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Singleton
public class StorageService {
    private static final Logger LOG = LoggerFactory.getLogger(StorageService.class);

    @Value("${medj.google.cloud.project-id:medj-505807}")
    private String projectId;

    @Value("${medj.google.cloud.storage-bucket:medj-505807-assets}")
    private String bucketName;

    @Value("${medj.local.storage-path:./uploads}")
    private String localStoragePath = "./uploads";

    private Path localStorageDir;
    private Storage gcsStorage;

    public StorageService() {
    }

    public StorageService(String localStoragePath) {
        this.localStoragePath = localStoragePath;
        init();
    }

    @PostConstruct
    public void init() {
        this.localStorageDir = Paths.get(localStoragePath).toAbsolutePath();
        try {
            Files.createDirectories(this.localStorageDir);
            LOG.info("MedJ local storage directory initialized at {}", this.localStorageDir);
        } catch (IOException e) {
            LOG.error("Failed to create local storage directory: {}", e.getMessage());
        }

        try {
            this.gcsStorage = StorageOptions.newBuilder()
                .setProjectId(projectId)
                .build()
                .getService();
            LOG.info("Connected to Google Cloud Storage (Project: {}, Bucket: {})", projectId, bucketName);
        } catch (Exception e) {
            LOG.warn("Google Cloud Storage client not available, using local directory only: {}", e.getMessage());
            this.gcsStorage = null;
        }
    }

    public String storeFile(String filename, String mimeType, InputStream inputStream) throws IOException {
        String safeName = UUID.randomUUID() + "_" + sanitizeFilename(filename);
        byte[] bytes = inputStream.readAllBytes();

        // 1. Always write locally for fast retrieval
        Path targetPath = localStorageDir.resolve(safeName);
        try (FileOutputStream out = new FileOutputStream(targetPath.toFile())) {
            out.write(bytes);
        }

        // 2. Upload to Google Cloud Storage if available
        if (gcsStorage != null && bucketName != null && !bucketName.isBlank()) {
            try {
                BlobId blobId = BlobId.of(bucketName, safeName);
                BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
                    .setContentType(mimeType != null ? mimeType : "application/octet-stream")
                    .build();
                gcsStorage.create(blobInfo, bytes);
                LOG.info("Successfully uploaded file '{}' to GCS bucket '{}' ({} bytes)", safeName, bucketName, bytes.length);
            } catch (Exception e) {
                LOG.warn("Failed to upload to GCS, kept in local storage: {}", e.getMessage());
            }
        }

        LOG.info("Stored file {} ({} bytes)", safeName, bytes.length);
        return "/api/storage/" + safeName;
    }

    public String storeImageBytes(String filenamePrefix, byte[] imageBytes) throws IOException {
        String safeName = (filenamePrefix != null ? sanitizeFilename(filenamePrefix) : "illus") + "_" + UUID.randomUUID() + ".png";

        // 1. Write locally
        Path targetPath = localStorageDir.resolve(safeName);
        Files.write(targetPath, imageBytes);

        // 2. Upload to GCS
        if (gcsStorage != null && bucketName != null && !bucketName.isBlank()) {
            try {
                BlobId blobId = BlobId.of(bucketName, safeName);
                BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
                    .setContentType("image/png")
                    .build();
                gcsStorage.create(blobInfo, imageBytes);
                LOG.info("Successfully uploaded image '{}' to GCS bucket '{}' ({} bytes)", safeName, bucketName, imageBytes.length);
            } catch (Exception e) {
                LOG.warn("Failed to upload image to GCS, kept in local storage: {}", e.getMessage());
            }
        }

        LOG.info("Stored image {} ({} bytes)", safeName, imageBytes.length);
        return "/api/storage/" + safeName;
    }

    public File getFile(String storedFilename) {
        String safe = sanitizeFilename(storedFilename);
        Path localPath = localStorageDir.resolve(safe);
        
        // If not present locally but GCS is available, fetch from GCS
        if (!Files.exists(localPath) && gcsStorage != null && bucketName != null) {
            try {
                Blob blob = gcsStorage.get(BlobId.of(bucketName, safe));
                if (blob != null && blob.exists()) {
                    Files.write(localPath, blob.getContent());
                    LOG.info("Downloaded missing file '{}' from GCS bucket '{}'", safe, bucketName);
                }
            } catch (Exception e) {
                LOG.warn("Failed to download from GCS: {}", e.getMessage());
            }
        }

        return localPath.toFile();
    }

    public byte[] readFileBytes(String storedFilename) throws IOException {
        String safe = sanitizeFilename(storedFilename);
        Path path = localStorageDir.resolve(safe);
        if (Files.exists(path)) {
            return Files.readAllBytes(path);
        }

        if (gcsStorage != null && bucketName != null) {
            try {
                Blob blob = gcsStorage.get(BlobId.of(bucketName, safe));
                if (blob != null && blob.exists()) {
                    byte[] content = blob.getContent();
                    Files.write(path, content);
                    return content;
                }
            } catch (Exception e) {
                LOG.warn("Failed to read from GCS: {}", e.getMessage());
            }
        }

        return new byte[0];
    }

    private String sanitizeFilename(String filename) {
        if (filename == null) return "file";
        String clean = filename.trim();
        if (clean.startsWith("/api/storage/")) {
            clean = clean.substring("/api/storage/".length());
        } else if (clean.startsWith("/storage/")) {
            clean = clean.substring("/storage/".length());
        }
        return clean.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
