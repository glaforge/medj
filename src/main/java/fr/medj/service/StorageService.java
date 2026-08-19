package fr.medj.service;

import io.micronaut.context.annotation.Value;
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

    private final Path localStorageDir;

    public StorageService(@Value("${medj.local.storage-path:./uploads}") String storagePath) {
        this.localStorageDir = Paths.get(storagePath).toAbsolutePath();
        try {
            Files.createDirectories(this.localStorageDir);
            LOG.info("MedJ storage directory initialized at {}", this.localStorageDir);
        } catch (IOException e) {
            LOG.error("Failed to create storage directory: {}", e.getMessage());
        }
    }

    public String storeFile(String filename, String mimeType, InputStream inputStream) throws IOException {
        String safeName = UUID.randomUUID() + "_" + sanitizeFilename(filename);
        Path targetPath = localStorageDir.resolve(safeName);
        
        try (FileOutputStream out = new FileOutputStream(targetPath.toFile())) {
            inputStream.transferTo(out);
        }
        
        LOG.info("Stored file {} ({} bytes)", safeName, Files.size(targetPath));
        return "/api/storage/" + safeName;
    }

    public String storeImageBytes(String filenamePrefix, byte[] imageBytes) throws IOException {
        String safeName = (filenamePrefix != null ? sanitizeFilename(filenamePrefix) : "illus") + "_" + UUID.randomUUID() + ".png";
        Path targetPath = localStorageDir.resolve(safeName);
        Files.write(targetPath, imageBytes);
        LOG.info("Stored image {} ({} bytes)", safeName, imageBytes.length);
        return "/api/storage/" + safeName;
    }

    public File getFile(String storedFilename) {
        return localStorageDir.resolve(sanitizeFilename(storedFilename)).toFile();
    }

    public byte[] readFileBytes(String storedFilename) throws IOException {
        Path path = localStorageDir.resolve(sanitizeFilename(storedFilename));
        if (Files.exists(path)) {
            return Files.readAllBytes(path);
        }
        return new byte[0];
    }

    private String sanitizeFilename(String filename) {
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
