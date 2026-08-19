import React, { useState, useRef, useEffect } from 'react';
import { Course } from '../types';
import { api } from '../services/api';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { htmlToMarkdown, markdownToHtml, HIGHLIGHT_COLORS, HighlightColor, getHighlightColor } from '../utils/richTextConverter';
import {
  X,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Highlighter,
  Link as LinkIcon,
  Unlink,
  ExternalLink,
  RotateCcw,
  Undo2,
  Redo2,
  RemoveFormatting,
  Edit3,
  Save,
  Sparkles,
  BookOpen,
  ClipboardCheck,
  Check,
  Globe,
  Trash2,
  ChevronDown
} from 'lucide-react';

interface EditCourseNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  onNotesSaved: (updatedCourse: Course) => void;
}

export const EditCourseNotesModal: React.FC<EditCourseNotesModalProps> = ({
  isOpen,
  onClose,
  course,
  onNotesSaved
}) => {
  useEscapeKey(isOpen, onClose);

  const [markdownValue, setMarkdownValue] = useState<string>(course.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // Link Insertion Dialog State
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [savedSelectionRange, setSavedSelectionRange] = useState<Range | null>(null);

  // 7-Color Highlight State
  const [selectedHighlightColor, setSelectedHighlightColor] = useState<string>('yellow');
  const [isHighlightPaletteOpen, setIsHighlightPaletteOpen] = useState(false);
  const [savedHighlightRange, setSavedHighlightRange] = useState<Range | null>(null);
  const highlightPaletteRef = useRef<HTMLDivElement>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  // Close highlight palette on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (highlightPaletteRef.current && !highlightPaletteRef.current.contains(e.target as Node)) {
        setIsHighlightPaletteOpen(false);
      }
    };
    if (isHighlightPaletteOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isHighlightPaletteOpen]);

  // Sync initial content on open or course change
  useEffect(() => {
    if (isOpen) {
      const initialNotes = course.notes || '';
      setMarkdownValue(initialNotes);
      updateCounts(initialNotes);
      setSaveSuccess(false);
      setIsLinkDialogOpen(false);
      setIsHighlightPaletteOpen(false);
      setSavedHighlightRange(null);

      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = markdownToHtml(initialNotes);
        }
      }, 50);
    }
  }, [isOpen, course.id, course.notes]);

  const updateCounts = (text: string) => {
    const cleanText = text.replace(/[#*`_~[\]()>-]/g, ' ').trim();
    const words = cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0;
    setWordCount(words);
    setCharCount(text.length);
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      const md = htmlToMarkdown(editorRef.current);
      setMarkdownValue(md);
      updateCounts(md);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // Native paste preserves rich clipboard HTML from Word, Google Docs, web
    setTimeout(() => {
      handleEditorInput();
    }, 10);
  };

  // Keyboard shortcut handler (Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+K)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openLinkDialog();
    }
  };

  // Formatting commands via document.execCommand
  const execFormat = (command: string, value: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  const toggleHighlightPalette = () => {
    if (!isHighlightPaletteOpen) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        setSavedHighlightRange(selection.getRangeAt(0).cloneRange());
      }
      setIsHighlightPaletteOpen(true);
    } else {
      setIsHighlightPaletteOpen(false);
    }
  };

  const applyHighlight = (colorId: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    if (colorId !== 'none') {
      setSelectedHighlightColor(colorId);
    }

    let targetRange: Range | null = null;
    const selection = window.getSelection();

    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      targetRange = selection.getRangeAt(0);
    } else if (savedHighlightRange) {
      targetRange = savedHighlightRange;
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedHighlightRange);
      }
    }

    if (!targetRange || targetRange.collapsed) {
      setIsHighlightPaletteOpen(false);
      return;
    }

    if (colorId === 'none') {
      let parentMark = targetRange.startContainer.parentElement?.closest('mark');
      if (parentMark && editorRef.current.contains(parentMark)) {
        const textNode = document.createTextNode(parentMark.textContent || '');
        parentMark.parentNode?.replaceChild(textNode, parentMark);
      } else {
        document.execCommand('removeFormat', false);
      }
      handleEditorInput();
      setIsHighlightPaletteOpen(false);
      return;
    }

    const color = getHighlightColor(colorId);

    let parentMark = targetRange.startContainer.parentElement?.closest('mark');
    if (parentMark && editorRef.current.contains(parentMark)) {
      parentMark.setAttribute('data-color', color.id);
      parentMark.className = `hl-${color.id} ${color.className} px-1 py-0.5 rounded font-medium`;
      handleEditorInput();
      setIsHighlightPaletteOpen(false);
      return;
    }

    const mark = document.createElement('mark');
    mark.setAttribute('data-color', color.id);
    mark.className = `hl-${color.id} ${color.className} px-1 py-0.5 rounded font-medium`;

    try {
      targetRange.surroundContents(mark);
    } catch {
      try {
        const fragment = targetRange.extractContents();
        mark.appendChild(fragment);
        targetRange.insertNode(mark);
      } catch {
        document.execCommand('hiliteColor', false, color.bgHex);
      }
    }

    handleEditorInput();
    setIsHighlightPaletteOpen(false);
  };

  // Open Link Dialog and remember selection
  const openLinkDialog = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      setSavedSelectionRange(range.cloneRange());
      const selectedText = selection.toString();
      setLinkText(selectedText);
    } else {
      setSavedSelectionRange(null);
      setLinkText('');
    }
    setLinkUrl('');
    setIsLinkDialogOpen(true);
  };

  // Apply Link
  const applyLink = () => {
    if (!linkUrl.trim()) {
      setIsLinkDialogOpen(false);
      return;
    }

    let url = linkUrl.trim();
    if (!/^https?:\/\//i.test(url) && !url.startsWith('mailto:') && !url.startsWith('/')) {
      url = 'https://' + url;
    }

    if (editorRef.current) {
      editorRef.current.focus();
      const selection = window.getSelection();

      if (savedSelectionRange && selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelectionRange);

        if (savedSelectionRange.collapsed || !linkText) {
          // Insert a new link element
          const a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.className = 'text-sky-600 dark:text-sky-400 hover:text-sky-500 underline font-medium cursor-pointer';
          a.textContent = linkText || url;
          savedSelectionRange.insertNode(a);
          savedSelectionRange.collapse(false);
        } else {
          document.execCommand('createLink', false, url);
        }
      } else {
        // Fallback insertion at current cursor
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'text-sky-600 dark:text-sky-400 hover:text-sky-500 underline font-medium cursor-pointer';
        a.textContent = linkText || url;
        editorRef.current.appendChild(a);
      }

      // Ensure all anchors inside editor have target and styling attributes
      const anchors = editorRef.current.querySelectorAll('a');
      anchors.forEach(a => {
        if (!a.getAttribute('target')) {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
        }
        if (!a.className) {
          a.className = 'text-sky-600 dark:text-sky-400 hover:text-sky-500 underline font-medium cursor-pointer';
        }
      });

      handleEditorInput();
    }

    setIsLinkDialogOpen(false);
    setLinkUrl('');
    setLinkText('');
    setSavedSelectionRange(null);
  };

  const removeLink = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('unlink', false);
    handleEditorInput();
  };

  const handleClearAll = () => {
    if (!editorRef.current) return;
    if (editorRef.current.innerText.trim().length > 0) {
      if (!window.confirm('Voulez-vous effacer tout le contenu de vos notes pour repartir à zéro ?')) {
        return;
      }
    }
    editorRef.current.innerHTML = '';
    setMarkdownValue('');
    updateCounts('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let finalMd = markdownValue;
      if (editorRef.current) {
        finalMd = htmlToMarkdown(editorRef.current);
      }

      const updated = await api.updateCourse(course.id, {
        ...course,
        notes: finalMd
      });

      setSaveSuccess(true);
      onNotesSaved(updated);
      setTimeout(() => {
        onClose();
      }, 400);
    } catch (e) {
      console.error('Failed to save notes', e);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleUp">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-extrabold text-white uppercase tracking-wider"
                  style={{ backgroundColor: course.color || '#0284c7' }}
                >
                  {course.ueCode}
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                  Notes & Synthèse personnelle
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {course.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Rich Text Toolbar */}
        <div className="relative z-30 px-4 py-2 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30 flex items-center gap-1 flex-wrap text-slate-700 dark:text-slate-300">
            {/* Headings */}
            <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => execFormat('formatBlock', '<h1>')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-600 transition-colors"
                title="Titre Principal (H1)"
              >
                <Heading1 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => execFormat('formatBlock', '<h2>')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-600 transition-colors"
                title="Sous-Titre (H2)"
              >
                <Heading2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => execFormat('formatBlock', '<h3>')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors"
                title="Section (H3)"
              >
                <Heading3 className="w-4 h-4" />
              </button>
            </div>

            {/* Inline Formatting */}
            <div className="flex items-center gap-0.5 px-2 border-r border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => execFormat('bold')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-colors"
                title="Gras (Ctrl+B)"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => execFormat('italic')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 italic transition-colors"
                title="Italique (Ctrl+I)"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => execFormat('underline')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 underline transition-colors"
                title="Souligné (Ctrl+U)"
              >
                <Underline className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => execFormat('strikeThrough')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 line-through transition-colors"
                title="Barré"
              >
                <Strikethrough className="w-4 h-4" />
              </button>
              {/* 7-Color Highlighter Button & Dropdown Palette */}
              <div className="relative inline-flex items-center" ref={highlightPaletteRef}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    toggleHighlightPalette();
                  }}
                  className={`p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer ${
                    isHighlightPaletteOpen ? 'bg-slate-200 dark:bg-slate-800' : ''
                  }`}
                  title="Couleur de surlignage"
                >
                  <Highlighter className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  <span
                    className="w-3 h-3 rounded-full border border-black/20 shrink-0 shadow-2xs"
                    style={{ backgroundColor: getHighlightColor(selectedHighlightColor).dotColor }}
                  />
                </button>

                {/* Fluo Palette Popover (Matching course color picker grid style) */}
                {isHighlightPaletteOpen && (
                  <div className="absolute top-full left-0 mt-1.5 z-50 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-2.5 w-64 animate-scaleUp">
                    <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Surligneur Fluo
                    </div>
                    <div className="grid grid-cols-7 gap-1.5 pt-0.5">
                      {HIGHLIGHT_COLORS.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applyHighlight(c.id);
                          }}
                          title={c.label}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-2xs cursor-pointer"
                          style={{ backgroundColor: c.dotColor }}
                        >
                          {selectedHighlightColor === c.id && (
                            <Check className="w-4 h-4 text-white drop-shadow stroke-[3]" />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyHighlight('none');
                        }}
                        className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-medium py-1 px-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Effacer le surlignage</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hypertext Links */}
            <div className="flex items-center gap-0.5 px-2 border-r border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={openLinkDialog}
                className="p-1.5 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-950/60 text-sky-700 dark:text-sky-400 transition-colors flex items-center gap-1"
                title="Insérer un lien hypertexte (Ctrl+K)"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={removeLink}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-red-500 transition-colors"
                title="Supprimer le lien"
              >
                <Unlink className="w-4 h-4" />
              </button>
            </div>

            {/* Lists & Quotes */}
            <div className="flex items-center gap-0.5 px-2 border-r border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => execFormat('insertUnorderedList')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                title="Liste à puces"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => execFormat('insertOrderedList')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                title="Liste numérotée"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => execFormat('formatBlock', '<blockquote>')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                title="Citation / Point clé"
              >
                <Quote className="w-4 h-4" />
              </button>
            </div>

            {/* History & Formatting Actions */}
            <div className="flex items-center gap-0.5 pl-2">
              <button
                type="button"
                onClick={() => execFormat('undo')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                title="Annuler (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => execFormat('redo')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                title="Rétablir (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => execFormat('removeFormat')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                title="Effacer la mise en forme sélectionnée"
              >
                <RemoveFormatting className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-500 transition-colors"
                title="Effacer tout le texte (repartir à zéro)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleEditorInput}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            className="min-h-[340px] max-h-[55vh] outline-none text-slate-800 dark:text-slate-200 text-xs leading-relaxed font-sans overflow-y-auto p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 focus:border-sky-500/80 focus:ring-2 focus:ring-sky-500/20 transition-all shadow-inner [&_a]:text-sky-600 dark:[&_a]:text-sky-400 [&_a]:underline [&_a]:underline-offset-2 [&_a]:font-medium [&_a]:cursor-pointer hover:[&_a]:text-sky-500 [&_mark]:px-1 [&_mark]:py-0.5 [&_mark]:rounded [&_blockquote]:border-l-4 [&_blockquote]:border-sky-500 [&_blockquote]:bg-sky-50 dark:[&_blockquote]:bg-sky-950/30 [&_blockquote]:px-3 [&_blockquote]:py-1.5 [&_blockquote]:my-2 [&_blockquote]:rounded-r-xl [&_blockquote]:italic [&_blockquote]:text-sky-900 dark:[&_blockquote]:text-sky-200 [&_h1]:text-base [&_h1]:font-extrabold [&_h1]:text-slate-950 dark:[&_h1]:text-white [&_h1]:mt-3 [&_h1]:mb-1.5 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-sky-700 dark:[&_h2]:text-sky-300 [&_h2]:mt-2.5 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-emerald-700 dark:[&_h3]:text-emerald-400 [&_h3]:mt-2 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_li]:my-0.5"
            data-placeholder="Tapez vos notes ici ou collez votre texte formaté (Word, Google Docs, liens Web, PDF)..."
          />
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span><strong>{wordCount}</strong> mot{wordCount > 1 ? 's' : ''}</span>
            <span>•</span>
            <span><strong>{charCount}</strong> caractères</span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-950/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Enregistré !</span>
                </>
              ) : isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Enregistrer mes notes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Link Insertion Modal Dialog */}
        {isLinkDialogOpen && (
          <div className="absolute inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4 animate-scaleUp">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <span>Insérer un lien hypertexte</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLinkDialogOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Texte affiché
                  </label>
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="Ex: Recommandation HAS 2024, Vidéo anatomie..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Adresse Web (URL)
                  </label>
                  <input
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://has-sante.fr/..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyLink();
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLinkDialogOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={applyLink}
                  disabled={!linkUrl.trim()}
                  className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  Insérer le lien
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default EditCourseNotesModal;
