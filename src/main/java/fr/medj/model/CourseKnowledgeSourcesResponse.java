package fr.medj.model;

import io.micronaut.serde.annotation.Serdeable;
import java.util.List;

@Serdeable
public record CourseKnowledgeSourcesResponse(
    String courseId,
    String courseTitle,
    String ueCode,
    List<CourseKnowledgeSource> sources,
    int totalCount
) {}
