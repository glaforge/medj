package fr.medj.model;

import io.micronaut.serde.annotation.Serdeable;
import java.util.List;

@Serdeable
public record QcmVerificationResult(
    String qcmId,
    boolean isAccurate,
    String summary,
    int errorCount,
    List<ItemVerification> itemVerifications,
    QcmQuestion correctedQcm,
    List<GroundingSource> groundingSources
) {}
