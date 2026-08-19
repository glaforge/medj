package fr.medj;

import fr.medj.model.QcmQuestion;
import fr.medj.service.FirestoreService;
import fr.medj.service.MedicalQcmTools;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class MedicalQcmToolsTest {

    private FirestoreService firestoreService;
    private MedicalQcmTools medicalQcmTools;

    @BeforeEach
    void setUp() {
        firestoreService = new FirestoreService();
        firestoreService.init();
        medicalQcmTools = new MedicalQcmTools(firestoreService);
    }

    @Test
    void testCreateAndSaveQcmViaTool() {
        int initialCount = firestoreService.getAllQcms().size();

        String result = medicalQcmTools.createAndSaveQcm(
            "Concernant les récepteurs membranaires et couplés aux protéines G (RCPG) :",
            "UE6",
            4,
            "Mnémotechnique : 7 passages transmembranaires",
            "Pharma,RCPG,Récepteurs",
            "Les RCPG possèdent 7 hélices alpha transmembranaires.", true, "VRAI : Structure heptahélicoïdale caractéristique.", false,
            "La sous-unité alpha fixe le GTP à l'état actif.", true, "VRAI : Échange GDP/GTP.", false,
            "L'adénylate cyclase transforme l'AMPc en ATP.", false, "FAUX : Elle synthétise l'AMPc à partir de l'ATP.", true,
            "La toxine cholérique inhibe de façon irréversible la sous-unité Gs.", false, "FAUX : Elle maintient Gs activée en permanence.", true,
            "Le récepteur bêta-1 adrénergique cardiaque est couplé à une protéine Gs.", true, "VRAI : Effet inotrope et chronotrope positif.", false
        );

        assertNotNull(result);
        assertTrue(result.startsWith("SUCCESS:"));

        List<QcmQuestion> polled = medicalQcmTools.pollRecentlyCreatedQcms();
        assertEquals(1, polled.size());

        QcmQuestion created = polled.get(0);
        assertEquals("UE6", created.ueCode());
        assertEquals(5, created.items().size());
        assertEquals("A", created.items().get(0).itemLetter());
        assertTrue(created.items().get(0).isTrue());
        assertEquals("C", created.items().get(2).itemLetter());
        assertFalse(created.items().get(2).isTrue());
        assertTrue(created.items().get(2).isTrap());

        // Check it was persisted in FirestoreService
        assertEquals(initialCount + 1, firestoreService.getAllQcms().size());
        assertTrue(firestoreService.getQcm(created.id()).isPresent());
    }
}
