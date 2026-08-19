import { MedicalIllustration } from '../types';

function healLegendItems(items: string[]): string[] {
  if (!items || items.length === 0) return [];
  const merged: string[] = [];
  let current = '';
  let openParenCount = 0;

  for (const item of items) {
    if (!item.trim()) continue;
    if (current) {
      current += ', ' + item.trim();
    } else {
      current = item.trim();
    }

    for (const c of item) {
      if (c === '(') openParenCount++;
      else if (c === ')') openParenCount--;
    }

    if (openParenCount <= 0) {
      merged.push(current.trim());
      current = '';
      openParenCount = 0;
    }
  }

  if (current) {
    merged.push(current.trim());
  }

  return merged;
}

export function printMedicalWorksheet(illustration: MedicalIllustration, includeAnswerKey: boolean = true) {
  const rawItems = illustration.legendItems && illustration.legendItems.length > 0
    ? illustration.legendItems
    : Array.from({ length: 8 }, (_, i) => `Repère ${i + 1}`);

  const legendItems = healLegendItems(rawItems);

  const isFillInTheBlank = illustration.illustrationType === 'DESSIN_A_TROUS' ||
    (illustration.prompt && illustration.prompt.toLowerCase().includes('trou')) ||
    (illustration.title && illustration.title.toLowerCase().includes('trou'));

  // Create an isolated invisible iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  let contentHtml = '';

  if (isFillInTheBlank) {
    // Fill-in-the-blank training worksheet with blank handwriting lines
    const itemsHtml = legendItems
      .map((item, idx) => {
        return `
          <div class="legend-slot">
            <span class="slot-num">(${idx + 1})</span>
            <div class="slot-line"></div>
          </div>
        `;
      })
      .join('');

    const answerKeyHtml = includeAnswerKey
      ? `
        <div class="answer-key-section">
          <div class="cut-line">
            <span>✂️ &nbsp; Corrigé officiel (à plier ou masquer pendant l'entraînement) &nbsp; ✂️</span>
          </div>
          <div class="answer-grid">
            ${legendItems
              .map((item, idx) => {
                const cleanText = item.replace(/^\d+[\.\)]\s*/, '');
                return `<div class="answer-item"><strong>(${idx + 1})</strong> ${cleanText}</div>`;
              })
              .join('')}
          </div>
        </div>
      `
      : '';

    contentHtml = `
      <div class="title-banner">
        <h2>${illustration.title}</h2>
        <p>Complétez les légendes numérotées sur les lignes ci-dessous sans regarder le corrigé.</p>
      </div>

      <div class="image-box">
        <img src="${illustration.imageUrl}" alt="${illustration.title}" />
      </div>

      <div class="work-section">
        <div class="work-title">Légendes à compléter au stylo (1 à ${legendItems.length}) :</div>
        <div class="legend-grid">
          ${itemsHtml}
        </div>
      </div>

      <div>
        ${answerKeyHtml}
      </div>
    `;
  } else {
    // Complete reference medical diagram / atlas sheet with clear legend nomenclature
    const referenceListHtml = legendItems
      .map((item, idx) => {
        const cleanText = item.replace(/^\d+[\.\)]\s*/, '');
        return `
          <div class="ref-item">
            <span class="ref-num">${idx + 1}</span>
            <span class="ref-text">${cleanText}</span>
          </div>
        `;
      })
      .join('');

    contentHtml = `
      <div class="title-banner">
        <h2>${illustration.title}</h2>
        <p>Fiche de synthèse didactique & Atlas anatomique de référence</p>
      </div>

      <div class="image-box">
        <img src="${illustration.imageUrl}" alt="${illustration.title}" />
      </div>

      <div class="work-section ref-section">
        <div class="work-title">Nomenclature & Structures Identifiées :</div>
        <div class="ref-grid">
          ${referenceListHtml}
        </div>
      </div>
    `;
  }

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>${illustration.title} - MedJ</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm 12mm 10mm 12mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 11pt;
          line-height: 1.3;
        }
        .sheet-container {
          width: 100%;
          max-width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 98vh;
        }
        .header {
          border-bottom: 2px solid #0f172a;
          padding-bottom: 8px;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .header-left h1 {
          font-size: 13.5pt;
          font-weight: 800;
          margin: 0 0 2px 0;
          color: #0f172a;
          letter-spacing: -0.02em;
        }
        .header-left .course-info {
          font-size: 10pt;
          font-weight: 600;
          color: #475569;
        }
        .header-right {
          text-align: right;
          font-size: 9.5pt;
          color: #334155;
        }
        .header-right .field {
          margin-bottom: 3px;
        }
        .title-banner {
          text-align: center;
          margin-bottom: 10px;
        }
        .title-banner h2 {
          font-size: 12pt;
          font-weight: 800;
          text-decoration: underline;
          text-underline-offset: 4px;
          margin: 0 0 3px 0;
          color: #0f172a;
        }
        .title-banner p {
          font-size: 8.5pt;
          color: #64748b;
          margin: 0;
          font-style: italic;
        }
        .image-box {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 10px;
          max-height: 380px;
          overflow: hidden;
          background: #ffffff;
        }
        .image-box img {
          max-width: 92%;
          max-height: 360px;
          width: auto;
          height: auto;
          object-fit: contain;
          border-radius: 4px;
        }
        .work-section {
          margin-top: 6px;
          padding: 8px 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }
        .ref-section {
          background: #ffffff;
          border: 1px solid #cbd5e1;
        }
        .work-title {
          font-size: 9.5pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #334155;
          margin-bottom: 8px;
        }
        .legend-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          column-gap: 24px;
          row-gap: 9px;
        }
        .legend-slot {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          font-size: 9.5pt;
        }
        .slot-num {
          font-weight: 800;
          color: #0f172a;
          min-width: 24px;
        }
        .slot-line {
          flex: 1;
          border-bottom: 1.5px dotted #94a3b8;
          height: 14px;
        }
        .ref-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          column-gap: 20px;
          row-gap: 6px;
        }
        .ref-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 9.5pt;
          padding: 3px 6px;
          background: #f1f5f9;
          border-radius: 4px;
        }
        .ref-num {
          font-weight: 800;
          color: #ffffff;
          background: #475569;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8pt;
          shrink-0;
        }
        .ref-text {
          font-weight: 600;
          color: #1e293b;
        }
        .answer-key-section {
          margin-top: 14px;
          padding-top: 6px;
        }
        .cut-line {
          text-align: center;
          font-size: 8pt;
          color: #64748b;
          border-top: 1px dashed #94a3b8;
          padding-top: 4px;
          margin-bottom: 6px;
          letter-spacing: 0.04em;
        }
        .answer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          column-gap: 16px;
          row-gap: 3px;
          font-size: 8pt;
          color: #334155;
          background: #f1f5f9;
          padding: 6px 10px;
          border-radius: 6px;
        }
        .answer-item strong {
          color: #0f172a;
        }
        .footer-tag {
          text-align: center;
          font-size: 7.5pt;
          color: #94a3b8;
          margin-top: 6px;
        }
      </style>
    </head>
    <body>
      <div class="sheet-container">
        <div>
          <div class="header">
            <div class="header-left">
              <h1>${isFillInTheBlank ? "MedJ • Planche d'Entraînement PASS / LAS" : "MedJ • Atlas & Schéma Anatomique PASS"}</h1>
              <div class="course-info">
                ${illustration.courseTitle || 'Anatomie & Sciences Médicales'} ${illustration.ueCode ? ' • ' + illustration.ueCode : ''}
              </div>
            </div>
            <div class="header-right">
              <div class="field"><strong>Nom :</strong> ........................................</div>
              <div class="field"><strong>Date :</strong> ........................................</div>
            </div>
          </div>

          ${contentHtml}
        </div>

        <div class="footer-tag">
          Document généré avec MedJ (Méthode des J) • Illustration propulsée par Gemini 3 Pro Image (Nano Banana Pro) (Google GenAI)
        </div>
      </div>
    </body>
    </html>
  `;

  doc.open();
  doc.write(fullHtml);
  doc.close();

  // Wait for the image inside the iframe to load before triggering print
  const imgElement = doc.querySelector('img');
  const triggerPrint = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1500);
  };

  if (imgElement && !imgElement.complete) {
    imgElement.onload = triggerPrint;
    imgElement.onerror = triggerPrint;
  } else {
    setTimeout(triggerPrint, 300);
  }
}
