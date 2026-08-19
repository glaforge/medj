export interface HighlightColor {
  id: string;
  label: string;
  dotColor: string;
  bgHex: string;
  className: string;
}

export const HIGHLIGHT_COLORS: HighlightColor[] = [
  { id: 'yellow', label: 'Jaune fluo', dotColor: '#eab308', bgHex: '#fef08a', className: 'bg-yellow-200 dark:bg-yellow-900/70 text-yellow-950 dark:text-yellow-100' },
  { id: 'green', label: 'Vert fluo', dotColor: '#22c55e', bgHex: '#bbf7d0', className: 'bg-emerald-200 dark:bg-emerald-900/70 text-emerald-950 dark:text-emerald-100' },
  { id: 'pink', label: 'Rose fluo', dotColor: '#ec4899', bgHex: '#fbcfe8', className: 'bg-pink-200 dark:bg-pink-900/70 text-pink-950 dark:text-pink-100' },
  { id: 'cyan', label: 'Bleu ciel fluo', dotColor: '#0ea5e9', bgHex: '#bae6fd', className: 'bg-sky-200 dark:bg-sky-900/70 text-sky-950 dark:text-sky-100' },
  { id: 'orange', label: 'Orange fluo', dotColor: '#f97316', bgHex: '#fed7aa', className: 'bg-orange-200 dark:bg-orange-900/70 text-orange-950 dark:text-orange-100' },
  { id: 'purple', label: 'Lavande fluo', dotColor: '#a855f7', bgHex: '#e9d5ff', className: 'bg-purple-200 dark:bg-purple-900/70 text-purple-950 dark:text-purple-100' },
  { id: 'rose', label: 'Corail fluo', dotColor: '#f43f5e', bgHex: '#fecaca', className: 'bg-rose-200 dark:bg-rose-900/70 text-rose-950 dark:text-rose-100' }
];

export function getHighlightColor(idOrColor?: string): HighlightColor {
  if (!idOrColor) return HIGHLIGHT_COLORS[0];
  const found = HIGHLIGHT_COLORS.find(c => c.id === idOrColor.toLowerCase());
  return found || HIGHLIGHT_COLORS[0];
}

/**
 * Converts a DOM node or HTML string into clean Markdown while preserving formatting
 * (bold, italic, underline, strikethrough, headings, lists, quotes, tables, links, 7-color highlights).
 */
export function htmlToMarkdown(htmlOrElement: string | HTMLElement): string {
  let container: HTMLElement;
  if (typeof htmlOrElement === 'string') {
    container = document.createElement('div');
    container.innerHTML = htmlOrElement;
  } else {
    container = htmlOrElement;
  }

  function traverse(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // Check for bold styles via inline style or tag
    const isBold = tag === 'b' || tag === 'strong' || el.style.fontWeight === 'bold' || parseInt(el.style.fontWeight, 10) >= 700;
    const isItalic = tag === 'i' || tag === 'em' || el.style.fontStyle === 'italic';
    const isUnderline = tag === 'u' || el.style.textDecoration?.includes('underline');
    const isStrike = tag === 's' || tag === 'strike' || tag === 'del' || el.style.textDecoration?.includes('line-through');

    // Highlight detection with 7-color support
    let highlightColorId = '';
    const isMarkTag = tag === 'mark';
    const hasBg = el.style.backgroundColor && el.style.backgroundColor !== 'transparent' && el.style.backgroundColor !== 'inherit';

    if (isMarkTag) {
      highlightColorId = el.getAttribute('data-color') || '';
      if (!highlightColorId) {
        for (const c of HIGHLIGHT_COLORS) {
          if (el.className.includes(c.id) || el.className.includes(c.className.split(' ')[0])) {
            highlightColorId = c.id;
            break;
          }
        }
      }
      if (!highlightColorId) highlightColorId = 'yellow';
    } else if (hasBg) {
      const bg = el.style.backgroundColor.toLowerCase();
      if (bg.includes('254, 240, 138') || bg.includes('yellow') || bg.includes('fef08a') || bg.includes('#ffff')) highlightColorId = 'yellow';
      else if (bg.includes('187, 247, 208') || bg.includes('green') || bg.includes('bbf7d0') || bg.includes('emerald')) highlightColorId = 'green';
      else if (bg.includes('251, 207, 232') || bg.includes('pink') || bg.includes('fbcfe8')) highlightColorId = 'pink';
      else if (bg.includes('186, 230, 253') || bg.includes('cyan') || bg.includes('bae6fd') || bg.includes('sky')) highlightColorId = 'cyan';
      else if (bg.includes('254, 215, 170') || bg.includes('orange') || bg.includes('fed7aa')) highlightColorId = 'orange';
      else if (bg.includes('233, 213, 255') || bg.includes('purple') || bg.includes('e9d5ff') || bg.includes('lavender')) highlightColorId = 'purple';
      else if (bg.includes('254, 202, 202') || bg.includes('rose') || bg.includes('fecaca') || bg.includes('red')) highlightColorId = 'rose';
      else highlightColorId = 'yellow';
    }

    let childrenText = '';
    for (let i = 0; i < el.childNodes.length; i++) {
      childrenText += traverse(el.childNodes[i]);
    }

    // Apply inline modifiers
    let text = childrenText;
    if (!text.trim()) {
      if (tag === 'br') return '\n';
      if (tag === 'hr') return '\n---\n\n';
      if (tag === 'p' || tag === 'div') return '\n\n';
      return '';
    }

    if (highlightColorId) {
      const cleanInner = text.replace(/<\/?mark[^>]*>/gi, '');
      text = `<mark data-color="${highlightColorId}">${cleanInner}</mark>`;
    }
    if (isStrike) text = `~~${text}~~`;
    if (isUnderline) text = `<u>${text}</u>`;
    if (isItalic) text = `*${text}*`;
    if (isBold) text = `**${text}**`;

    switch (tag) {
      case 'h1':
        return `\n# ${text.trim()}\n\n`;
      case 'h2':
        return `\n## ${text.trim()}\n\n`;
      case 'h3':
        return `\n### ${text.trim()}\n\n`;
      case 'h4':
        return `\n#### ${text.trim()}\n\n`;
      case 'h5':
        return `\n##### ${text.trim()}\n\n`;
      case 'h6':
        return `\n###### ${text.trim()}\n\n`;
      case 'p':
        return `\n\n${text.trim()}\n\n`;
      case 'div':
        return `\n${text}\n`;
      case 'blockquote':
        return `\n> ${text.trim().replace(/\n/g, '\n> ')}\n\n`;
      case 'code':
        if (el.parentElement?.tagName.toLowerCase() === 'pre') return text;
        return `\`${text}\``;
      case 'pre':
        return `\n\`\`\`\n${text.trim()}\n\`\`\`\n\n`;
      case 'ul':
        return `\n${Array.from(el.children).map(li => `- ${traverse(li).trim()}`).join('\n')}\n\n`;
      case 'ol':
        return `\n${Array.from(el.children).map((li, idx) => `${idx + 1}. ${traverse(li).trim()}`).join('\n')}\n\n`;
      case 'li':
        return `${text.trim()}`;
      case 'a': {
        const href = el.getAttribute('href') || '';
        return href ? `[${text}](${href})` : text;
      }
      case 'table': {
        const rows = Array.from(el.querySelectorAll('tr'));
        if (rows.length === 0) return '';
        let mdTable = '\n';
        rows.forEach((row, rIdx) => {
          const cells = Array.from(row.querySelectorAll('th, td')).map(c => traverse(c).trim().replace(/\|/g, '\\|'));
          mdTable += `| ${cells.join(' | ')} |\n`;
          if (rIdx === 0) {
            mdTable += `| ${cells.map(() => '---').join(' | ')} |\n`;
          }
        });
        return mdTable + '\n';
      }
      case 'br':
        return '\n';
      case 'hr':
        return '\n---\n\n';
      default:
        return text;
    }
  }

  const rawMd = traverse(container);

  // Clean up excessive blank lines and any residual duplicate marks
  return rawMd
    .replace(/<mark\b[^>]*>\s*<mark\b([^>]*)>/gi, '<mark $1>')
    .replace(/<\/mark>\s*<\/mark>/gi, '</mark>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Converts Markdown or plain text to formatted HTML suitable for ContentEditable
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  let str = markdown;

  // 1. Decode any escaped/entity-encoded formatting tags
  str = str
    .replace(/&amp;lt;/gi, '&lt;')
    .replace(/&amp;gt;/gi, '&gt;')
    .replace(/&lt;(\/?(?:mark|u|b|i|strong|em|a|code|p|div|h[1-6]|ul|ol|li|blockquote)[^&]*?)&gt;/gi, '<$1>');

  // 2. Clean duplicate nested mark tags
  str = str.replace(/<mark\b[^>]*>\s*<mark\b([^>]*)>/gi, '<mark $1>');
  str = str.replace(/<\/mark>\s*<\/mark>/gi, '</mark>');

  // 3. Convert markdown ==text== highlight syntax to <mark>
  str = str.replace(/==([^=\n]+)==/g, '<mark data-color="yellow">$1</mark>');

  // 4. Normalize all mark tags (handles data-color, class, style in any order)
  str = str.replace(/<mark\b([^>]*)>([\s\S]*?)<\/mark>/gi, (_, attrs, inner) => {
    let colorId = 'yellow';
    const dataColorMatch = attrs.match(/data-color=["']([a-z]+)["']/i);
    const classMatch = attrs.match(/(?:hl-|mark-)([a-z]+)/i);
    const styleMatch = attrs.match(/background(?:-color)?:\s*([^;"]+)/i);

    if (dataColorMatch) {
      colorId = dataColorMatch[1].toLowerCase();
    } else if (classMatch) {
      colorId = classMatch[1].toLowerCase();
    } else if (styleMatch) {
      const s = styleMatch[1].toLowerCase();
      if (s.includes('pink') || s.includes('251, 207, 232')) colorId = 'pink';
      else if (s.includes('green') || s.includes('187, 247, 208') || s.includes('emerald')) colorId = 'green';
      else if (s.includes('cyan') || s.includes('186, 230, 253') || s.includes('sky')) colorId = 'cyan';
      else if (s.includes('orange') || s.includes('254, 215, 170')) colorId = 'orange';
      else if (s.includes('purple') || s.includes('233, 213, 255')) colorId = 'purple';
      else if (s.includes('rose') || s.includes('254, 202, 202') || s.includes('red')) colorId = 'rose';
      else colorId = 'yellow';
    }

    const c = getHighlightColor(colorId);
    const cleanInner = inner.replace(/<\/?mark[^>]*>/gi, '');
    return `MARK_PLACEHOLDER_START_${c.id}_MARK_PLACEHOLDER_END${cleanInner}MARK_PLACEHOLDER_CLOSE`;
  });

  // 5. Escape HTML characters (while keeping placeholders safe)
  let html = str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&lt;u&gt;/gi, '<u>')
    .replace(/&lt;\/u&gt;/gi, '</u>');

  // 6. Restore <mark> elements with full CSS classes
  html = html.replace(/MARK_PLACEHOLDER_START_([a-z]+)_MARK_PLACEHOLDER_END([\s\S]*?)MARK_PLACEHOLDER_CLOSE/g, (_, colorId, inner) => {
    const color = getHighlightColor(colorId);
    return `<mark data-color="${color.id}" class="hl-${color.id} ${color.className} px-1 py-0.5 rounded font-medium">${inner}</mark>`;
  });

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-2 mb-1">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-sm font-bold text-sky-600 dark:text-sky-300 mt-3 mb-1.5">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-base font-extrabold text-slate-900 dark:text-white mt-4 mb-2">$1</h1>');

  // Bold & Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
  html = html.replace(/~~(.*?)~~/gim, '<del>$1</del>');

  // Code
  html = html.replace(/`([^`]+)`/gim, '<code class="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-xs text-sky-600">$1</code>');

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+|\/[^\s)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-sky-600 dark:text-sky-400 hover:text-sky-500 underline font-medium">$1</a>');

  // Quotes
  html = html.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-sky-500 pl-3 py-1 my-2 bg-sky-50 dark:bg-sky-950/30 text-sky-900 dark:text-sky-200 italic">$1</blockquote>');

  // Lists
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li class="ml-4 list-disc">$1</li>');
  html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<li class="ml-4 list-decimal">$1</li>');

  // Paragraphs / Newlines
  const lines = html.split('\n');
  const wrappedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '<br>';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<li') || trimmed.startsWith('<blockquote')) {
      return trimmed;
    }
    return `<div>${trimmed}</div>`;
  });

  return wrappedLines.join('');
}

