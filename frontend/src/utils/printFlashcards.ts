import { Flashcard } from '../types';
import katex from 'katex';

export type FlashcardPrintLayout = 'FOLDABLE_3' | 'FOLDABLE_4' | 'GRID_6' | 'TABLE_SUMMARY' | 'TWO_SIDED_MIRROR';

export interface FlashcardPrintOptions {
  layout: FlashcardPrintLayout;
  includeHints: boolean;
  includeTags: boolean;
  includeCutMarks: boolean;
  title?: string;
}

/**
 * Escapes plain HTML characters outside of mathematical blocks
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderMarkdownAndMath(text: string): string {
  if (!text) return '';

  // 0. Normalize escaped literal newlines and carriage returns
  let processed = text.replace(/\\n/g, '\n').replace(/\\r/g, '');

  // 1. Render Display Math: $$ ... $$ or \[ ... \]
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return `<span class="math-error">$$${escapeHtml(math)}$$</span>`;
    }
  });
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return `<span class="math-error">\\[${escapeHtml(math)}\\]</span>`;
    }
  });

  // 2. Render Inline Math: $ ... $ or \( ... \)
  processed = processed.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<span class="math-error">$${escapeHtml(math)}$</span>`;
    }
  });
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<span class="math-error">\\(${escapeHtml(math)}\\)</span>`;
    }
  });

  // 3. Process markdown formatting for text outside KaTeX
  // Bold
  processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  processed = processed.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Italic
  processed = processed.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
  processed = processed.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Inline code
  processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Lists & bullet points
  processed = processed.replace(/^[\*\-]\s+(.+)$/gm, '<div class="bullet-row"><span class="bullet-dot">•</span> <span>$1</span></div>');
  processed = processed.replace(/^(\d+[\.\)])\s+(.+)$/gm, '<div class="bullet-row"><span class="bullet-num"><strong>$1</strong></span> <span>$2</span></div>');

  // Line breaks
  processed = processed.replace(/\n\n/g, '<br/>');
  processed = processed.replace(/\n/g, '<br/>');

  return processed;
}

/**
 * Generates the complete HTML document for printing flashcards on A4 paper
 */
export function generateFlashcardsPrintHtml(
  flashcards: Flashcard[],
  options: FlashcardPrintOptions
): string {
  const {
    layout = 'FOLDABLE_3',
    includeHints = true,
    includeTags = true,
    includeCutMarks = true,
    title = 'MedJ — Flashcards de Révision'
  } = options;

  let bodyContent = '';

  if (layout === 'FOLDABLE_3' || layout === 'FOLDABLE_4') {
    const cardsPerPage = layout === 'FOLDABLE_3' ? 3 : 4;
    const pages: Flashcard[][] = [];
    for (let i = 0; i < flashcards.length; i += cardsPerPage) {
      pages.push(flashcards.slice(i, i + cardsPerPage));
    }

    bodyContent = pages
      .map((pageCards, pageIdx) => `
        <div class="print-page">
          <div class="page-header">
            <span class="brand">MedJ • Mémorisation Active PASS</span>
            <span class="doc-title">${escapeHtml(title)}</span>
            <span class="page-num">Page ${pageIdx + 1} / ${pages.length}</span>
          </div>

          <div class="foldable-grid foldable-grid-${cardsPerPage}">
            ${pageCards
              .map(card => `
                <div class="foldable-card ${includeCutMarks ? 'has-cut-marks' : ''}">
                  <!-- Left side: Front (Question) - Exact 50% width -->
                  <div class="card-half card-front">
                    <div class="card-badge-row">
                      <span class="badge badge-ue">${escapeHtml(card.ueCode || 'UE')}</span>
                      <span class="badge badge-type">QUESTION (RECTO)</span>
                      ${includeTags && card.tags && card.tags.length > 0 ? `<span class="card-tags">#${escapeHtml(card.tags.join(' #'))}</span>` : ''}
                    </div>
                    <div class="card-content question-text">
                      ${renderMarkdownAndMath(card.front)}
                    </div>
                    ${includeHints && card.hint ? `
                      <div class="card-hint">
                        <span class="hint-icon">💡</span>
                        <span><strong>Indice :</strong> ${renderMarkdownAndMath(card.hint)}</span>
                      </div>
                    ` : ''}
                  </div>

                  <!-- Central Fold Guide Overlay on exact 50% axis -->
                  <div class="fold-guide-overlay">
                    <div class="fold-notch-top">▼ PLI</div>
                    <div class="fold-badge">✂️ PLIER ICI ✂️</div>
                    <div class="fold-notch-bottom">▲ PLI</div>
                  </div>

                  <!-- Right side: Back (Answer) - Exact 50% width -->
                  <div class="card-half card-back">
                    <div class="card-badge-row">
                      <span class="badge badge-type badge-answer">RÉPONSE (VERSO)</span>
                      <span class="course-label">${escapeHtml(card.courseTitle || '')}</span>
                    </div>
                    <div class="card-content answer-text">
                      ${renderMarkdownAndMath(card.back)}
                    </div>
                  </div>
                </div>
              `)
              .join('')}
          </div>

          <div class="page-footer">
            <span>✂️ Découpez les contours des rectangles puis pliez chaque fiche en deux le long de la ligne centrale pointillée.</span>
          </div>
        </div>
      `)
      .join('');
  } else if (layout === 'GRID_6') {
    // 6 cards per page (2 columns x 3 rows). Compact rectangular cards
    const cardsPerPage = 6;
    const pages: Flashcard[][] = [];
    for (let i = 0; i < flashcards.length; i += cardsPerPage) {
      pages.push(flashcards.slice(i, i + cardsPerPage));
    }

    bodyContent = pages
      .map((pageCards, pageIdx) => `
        <div class="print-page">
          <div class="page-header">
            <span class="brand">MedJ • Fiches Découpables</span>
            <span class="doc-title">${escapeHtml(title)}</span>
            <span class="page-num">Page ${pageIdx + 1} / ${pages.length}</span>
          </div>

          <div class="grid-6-container">
            ${pageCards
              .map(card => `
                <div class="compact-card ${includeCutMarks ? 'has-cut-marks' : ''}">
                  <div class="compact-top">
                    <div class="card-badge-row">
                      <span class="badge badge-ue">${escapeHtml(card.ueCode || 'UE')}</span>
                      <span class="course-label truncate">${escapeHtml(card.courseTitle || '')}</span>
                    </div>
                    <div class="compact-question">
                      <strong>Q : </strong>${renderMarkdownAndMath(card.front)}
                    </div>
                    ${includeHints && card.hint ? `
                      <div class="card-hint-compact">
                        <span>💡 ${renderMarkdownAndMath(card.hint)}</span>
                      </div>
                    ` : ''}
                  </div>

                  <div class="compact-divider">
                    <span>— Réponse —</span>
                  </div>

                  <div class="compact-bottom">
                    <div class="compact-answer">
                      ${renderMarkdownAndMath(card.back)}
                    </div>
                  </div>
                </div>
              `)
              .join('')}
          </div>
        </div>
      `)
      .join('');
  } else if (layout === 'TABLE_SUMMARY') {
    // A4 Revision Sheet Table
    bodyContent = `
      <div class="print-page table-page">
        <div class="page-header">
          <span class="brand">MedJ • Fiche de Synthèse Mémorisation</span>
          <span class="doc-title">${escapeHtml(title)}</span>
          <span class="page-num">${flashcards.length} carte${flashcards.length > 1 ? 's' : ''}</span>
        </div>

        <table class="summary-table">
          <thead>
            <tr>
              <th style="width: 10%;">UE</th>
              <th style="width: 20%;">Cours</th>
              <th style="width: 32%;">Question (Recto)</th>
              ${includeHints ? '<th style="width: 14%;">Indice</th>' : ''}
              <th style="width: ${includeHints ? '24%' : '38%'};">Réponse (Verso)</th>
            </tr>
          </thead>
          <tbody>
            ${flashcards
              .map((card, idx) => `
                <tr class="${idx % 2 === 0 ? 'even-row' : 'odd-row'}">
                  <td class="td-ue"><strong>${escapeHtml(card.ueCode || 'UE')}</strong></td>
                  <td class="td-course">${escapeHtml(card.courseTitle || '')}</td>
                  <td class="td-question">${renderMarkdownAndMath(card.front)}</td>
                  ${includeHints ? `<td class="td-hint">${card.hint ? '💡 ' + renderMarkdownAndMath(card.hint) : '—'}</td>` : ''}
                  <td class="td-answer">${renderMarkdownAndMath(card.back)}</td>
                </tr>
              `)
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (layout === 'TWO_SIDED_MIRROR') {
    // 6 cards per page with Mirrored Back page for automatic duplex printing
    const cardsPerPage = 6;
    const pages: { fronts: Flashcard[]; backs: Flashcard[] }[] = [];
    for (let i = 0; i < flashcards.length; i += cardsPerPage) {
      const chunk = flashcards.slice(i, i + cardsPerPage);
      const fronts = [...chunk];
      const backs: Flashcard[] = [];
      for (let r = 0; r < chunk.length; r += 2) {
        if (r + 1 < chunk.length) {
          backs.push(chunk[r + 1]);
          backs.push(chunk[r]);
        } else {
          backs.push(chunk[r]);
        }
      }
      pages.push({ fronts, backs });
    }

    bodyContent = pages
      .map((page, pageIdx) => `
        <!-- FRONTS PAGE (Rectos) -->
        <div class="print-page">
          <div class="page-header">
            <span class="brand">MedJ • Recto (Questions)</span>
            <span class="doc-title">${escapeHtml(title)}</span>
            <span class="page-num">Feuille ${pageIdx + 1}A</span>
          </div>
          <div class="mirror-grid">
            ${page.fronts
              .map(card => `
                <div class="mirror-card-front ${includeCutMarks ? 'has-cut-marks' : ''}">
                  <div class="card-badge-row">
                    <span class="badge badge-ue">${escapeHtml(card.ueCode || 'UE')}</span>
                    <span class="badge badge-type">RECTO</span>
                  </div>
                  <div class="mirror-question">
                    ${renderMarkdownAndMath(card.front)}
                  </div>
                  ${includeHints && card.hint ? `
                    <div class="card-hint">
                      <span>💡 <strong>Indice :</strong> ${renderMarkdownAndMath(card.hint)}</span>
                    </div>
                  ` : ''}
                </div>
              `)
              .join('')}
          </div>
        </div>

        <!-- BACKS PAGE (Versos Mirror) -->
        <div class="print-page">
          <div class="page-header">
            <span class="brand">MedJ • Verso (Réponses)</span>
            <span class="doc-title">${escapeHtml(title)}</span>
            <span class="page-num">Feuille ${pageIdx + 1}B</span>
          </div>
          <div class="mirror-grid">
            ${page.backs
              .map(card => `
                <div class="mirror-card-back ${includeCutMarks ? 'has-cut-marks' : ''}">
                  <div class="card-badge-row">
                    <span class="badge badge-type badge-answer">VERSO</span>
                    <span class="course-label">${escapeHtml(card.courseTitle || '')}</span>
                  </div>
                  <div class="mirror-answer">
                    ${renderMarkdownAndMath(card.back)}
                  </div>
                </div>
              `)
              .join('')}
          </div>
        </div>
      `)
      .join('');
  }

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(title)} — Impression Flashcards MedJ</title>
      
      <!-- KaTeX CSS for formula rendering -->
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">

      <style>
        @page {
          size: A4 portrait;
          margin: 7mm 8mm 6mm 8mm;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          font-size: 10pt;
        }

        .print-page {
          page-break-before: always;
          page-break-after: always;
          break-before: page;
          break-after: page;
          page-break-inside: avoid;
          break-inside: avoid;
          width: 100%;
          min-height: 265mm;
          max-height: 275mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          padding: 2mm 0;
        }

        .print-page:first-child {
          page-break-before: avoid;
          break-before: avoid;
        }

        .print-page:last-child {
          page-break-after: avoid;
          break-after: avoid;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1.5pt solid #cbd5e1;
          padding-bottom: 2mm;
          margin-bottom: 3mm;
          font-size: 8.5pt;
          flex-shrink: 0;
        }

        .page-header .brand {
          font-weight: 800;
          color: #d97706;
          text-transform: uppercase;
          letter-spacing: 0.5pt;
        }

        .page-header .doc-title {
          font-weight: 600;
          color: #334155;
        }

        .page-header .page-num {
          font-weight: 500;
          color: #64748b;
        }

        .page-footer {
          border-top: 1pt solid #e2e8f0;
          padding-top: 1.5mm;
          margin-top: 2mm;
          font-size: 7.5pt;
          color: #64748b;
          text-align: center;
          flex-shrink: 0;
        }

        /* Foldable Layouts (3 and 4) */
        .foldable-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 4mm;
          flex: 1;
          align-content: space-between;
        }

        .foldable-grid-3 {
          grid-template-rows: repeat(3, 1fr);
        }

        .foldable-grid-4 {
          grid-template-rows: repeat(4, 1fr);
        }

        .foldable-card {
          border: 1.5pt solid #94a3b8;
          border-radius: 0;
          display: grid;
          grid-template-columns: 50% 50%;
          width: 100%;
          overflow: hidden;
          position: relative;
          box-sizing: border-box;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          break-inside: avoid-page !important;
        }

        .foldable-grid-3 .foldable-card {
          min-height: 72mm;
          max-height: 82mm;
        }

        .foldable-grid-4 .foldable-card {
          min-height: 54mm;
          max-height: 60mm;
        }

        .foldable-card.has-cut-marks {
          border: 1.5pt dashed #64748b;
        }

        .card-half {
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          padding: 3mm 4.5mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
        }

        .card-front {
          background-color: #ffffff;
          box-sizing: border-box;
          border-right: 1.5pt dashed #d97706; /* Exact 50% center fold line */
        }

        .card-back {
          background-color: #f8fafc;
          box-sizing: border-box;
        }

        .fold-guide-overlay {
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          pointer-events: none;
          z-index: 10;
        }

        .fold-notch-top, .fold-notch-bottom {
          font-size: 6pt;
          font-weight: 800;
          color: #d97706;
          background: #ffffff;
          border: 0.8pt solid #fde68a;
          padding: 0.3mm 1mm;
          border-radius: 1mm;
          line-height: 1;
        }

        .fold-badge {
          transform: rotate(-90deg);
          white-space: nowrap;
          font-size: 6pt;
          font-weight: 800;
          color: #d97706;
          background: #ffffff;
          border: 0.8pt solid #fde68a;
          padding: 0.6mm 1.5mm;
          border-radius: 1.5mm;
          letter-spacing: 0.5pt;
        }

        .card-badge-row {
          display: flex;
          align-items: center;
          gap: 1.5mm;
          margin-bottom: 1.5mm;
          flex-shrink: 0;
        }

        .badge {
          display: inline-block;
          font-size: 7pt;
          font-weight: 800;
          text-transform: uppercase;
          padding: 0.6mm 1.8mm;
          border-radius: 1.2mm;
          border: 1pt solid #cbd5e1;
        }

        .badge-ue {
          background-color: #fef3c7;
          color: #92400e;
          border-color: #fde68a;
        }

        .badge-type {
          background-color: #f1f5f9;
          color: #334155;
          border-color: #e2e8f0;
        }

        .badge-answer {
          background-color: #ecfdf5;
          color: #065f46;
          border-color: #a7f3d0;
        }

        .card-tags {
          font-size: 6.5pt;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .course-label {
          font-size: 7pt;
          font-weight: 600;
          color: #475569;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .card-content {
          margin: auto 0;
          padding: 1mm 0;
          line-height: 1.3;
          overflow: hidden;
        }

        .question-text {
          font-size: 10pt;
          font-weight: 700;
          color: #0f172a;
        }

        .answer-text {
          font-size: 9.5pt;
          font-weight: 500;
          color: #1e293b;
        }

        .card-hint {
          font-size: 7.5pt;
          color: #78350f;
          background: #fffbeb;
          border: 0.8pt solid #fef3c7;
          padding: 0.8mm 2mm;
          border-radius: 1.5mm;
          margin-top: 1.5mm;
          flex-shrink: 0;
        }

        /* Grid 6 Layout */
        .grid-6-container {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          grid-template-rows: repeat(3, 1fr);
          gap: 4mm;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          flex: 1;
        }

        .compact-card {
          border: 1.5pt solid #cbd5e1;
          border-radius: 2mm;
          padding: 3mm 3.5mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: #ffffff;
          min-height: 72mm;
          max-height: 80mm;
          min-width: 0;
          max-width: 100%;
          width: 100%;
          box-sizing: border-box;
          overflow: hidden;
          word-break: break-word;
          overflow-wrap: break-word;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          break-inside: avoid-page !important;
        }

        .compact-card.has-cut-marks {
          border: 1.5pt dashed #94a3b8;
        }

        .compact-top, .compact-bottom {
          min-width: 0;
          max-width: 100%;
          overflow: hidden;
          word-break: break-word;
          overflow-wrap: break-word;
        }

        .compact-question {
          font-size: 9pt;
          font-weight: 600;
          color: #0f172a;
          margin: 1.5mm 0;
          line-height: 1.25;
          word-break: break-word;
          overflow-wrap: break-word;
        }

        .compact-divider {
          text-align: center;
          border-bottom: 1pt dashed #cbd5e1;
          line-height: 0.1em;
          margin: 1.5mm 0;
        }

        .compact-divider span {
          background: #ffffff;
          padding: 0 1.5mm;
          font-size: 6.5pt;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .compact-answer {
          font-size: 8.5pt;
          color: #1e293b;
          margin-top: 1mm;
          line-height: 1.25;
          word-break: break-word;
          overflow-wrap: break-word;
        }

        .bullet-row {
          display: flex;
          align-items: baseline;
          gap: 1.5mm;
          margin-bottom: 0.8mm;
          line-height: 1.25;
        }

        .bullet-dot, .bullet-num {
          font-size: 8pt;
          color: #d97706;
          flex-shrink: 0;
        }

        .card-hint-compact {
          font-size: 7pt;
          color: #92400e;
          background: #fef3c7;
          padding: 0.6mm 1.5mm;
          border-radius: 1.2mm;
          margin-top: 1mm;
          word-break: break-word;
        }

        /* Table Summary Layout */
        .summary-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8.5pt;
          margin-top: 2mm;
        }

        .summary-table th {
          background-color: #f1f5f9;
          color: #1e293b;
          font-weight: 700;
          text-align: left;
          padding: 2mm 2.5mm;
          border: 1pt solid #cbd5e1;
          font-size: 7.5pt;
          text-transform: uppercase;
        }

        .summary-table td {
          padding: 2mm 2.5mm;
          border: 0.8pt solid #e2e8f0;
          vertical-align: top;
          line-height: 1.3;
        }

        .even-row {
          background-color: #ffffff;
        }

        .odd-row {
          background-color: #f8fafc;
        }

        .td-ue {
          font-weight: 800;
          color: #d97706;
        }

        .td-course {
          font-weight: 600;
          color: #334155;
        }

        .td-question {
          font-weight: 600;
          color: #0f172a;
        }

        .td-hint {
          color: #92400e;
          font-size: 7.5pt;
          background-color: #fffbeb;
        }

        .td-answer {
          color: #0f172a;
        }

        /* Mirror 6 Layout */
        .mirror-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          grid-template-rows: repeat(3, 1fr);
          gap: 4mm;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          flex: 1;
        }

        .mirror-card-front, .mirror-card-back {
          border: 1.5pt solid #cbd5e1;
          border-radius: 2mm;
          padding: 3.5mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 72mm;
          max-height: 80mm;
          min-width: 0;
          max-width: 100%;
          width: 100%;
          box-sizing: border-box;
          overflow: hidden;
          word-break: break-word;
          overflow-wrap: break-word;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          break-inside: avoid-page !important;
        }

        .mirror-card-front.has-cut-marks, .mirror-card-back.has-cut-marks {
          border: 1.5pt dashed #94a3b8;
        }

        .mirror-card-front {
          background: #ffffff;
        }

        .mirror-card-back {
          background: #f8fafc;
        }

        .mirror-question {
          font-size: 10pt;
          font-weight: 700;
          color: #0f172a;
          margin: auto 0;
          text-align: center;
          line-height: 1.3;
        }

        .mirror-answer {
          font-size: 9.5pt;
          font-weight: 500;
          color: #1e293b;
          margin: auto 0;
          line-height: 1.3;
        }

        /* KaTeX formula typography */
        .katex {
          font-size: 1.02em;
        }

        code {
          background: #f1f5f9;
          padding: 0.4mm 1.2mm;
          border-radius: 1mm;
          font-family: monospace;
          font-size: 8.5pt;
        }

        @media print {
          body {
            padding: 0;
          }
          .print-page {
            page-break-after: always;
            break-after: page;
          }
        }
      </style>
    </head>
    <body>
      ${bodyContent}
    </body>
    </html>
  `;
}

/**
 * Triggers printing using an invisible iframe
 */
export function printFlashcards(
  flashcards: Flashcard[],
  options: FlashcardPrintOptions
): void {
  if (!flashcards || flashcards.length === 0) return;

  const html = generateFlashcardsPrintHtml(flashcards, options);

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

  doc.open();
  doc.write(html);
  doc.close();

  // Wait for fonts & KaTeX stylesheets to settle before calling print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Print iframe error', e);
    } finally {
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 2000);
    }
  }, 400);
}
