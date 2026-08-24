import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Course } from '../types';
import { getContrastTextColor } from '../utils/colorUtils';
import {
  Search,
  Check,
  ChevronsUpDown,
  X,
  BookOpen,
  Sparkles,
  Layers
} from 'lucide-react';

export interface CourseComboboxProps {
  courses: Course[];
  selectedCourseId: string;
  onSelectCourse: (courseId: string) => void;
  className?: string;
  buttonClassName?: string;
  placeholder?: string;
  generalOptionLabel?: string;
  allowClear?: boolean;
  fullWidth?: boolean;
  dropdownPlacement?: 'left' | 'right';
}

/**
 * Normalizes text for accent-insensitive, case-insensitive comparison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Fuzzy search scorer: checks if all query tokens appear in the target text
 */
function matchesQuery(queryTokens: string[], target: string): boolean {
  if (queryTokens.length === 0) return true;
  const normalizedTarget = normalizeText(target);
  return queryTokens.every(token => normalizedTarget.includes(token));
}

export const CourseCombobox: React.FC<CourseComboboxProps> = ({
  courses,
  selectedCourseId,
  onSelectCourse,
  className = '',
  buttonClassName = '',
  placeholder = 'Rechercher un cours ou une UE...',
  generalOptionLabel = 'Contexte général PASS',
  allowClear = true,
  fullWidth = false,
  dropdownPlacement = 'right'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUeFilter, setSelectedUeFilter] = useState<string>('ALL');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Selected course details
  const selectedCourse = useMemo(() => {
    return courses.find(c => c.id === selectedCourseId);
  }, [courses, selectedCourseId]);

  // Extract unique UEs for quick filter pills
  const availableUes = useMemo(() => {
    const ues = new Set<string>();
    courses.forEach(c => {
      if (c.ueCode) ues.add(c.ueCode.toUpperCase());
    });
    return Array.from(ues).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [courses]);

  // Filtered courses based on search query + UE filter
  const filteredCourses = useMemo(() => {
    const queryTokens = normalizeText(searchQuery).split(/\s+/).filter(Boolean);

    return courses.filter(c => {
      // 1. UE pill filter
      if (selectedUeFilter !== 'ALL' && c.ueCode?.toUpperCase() !== selectedUeFilter) {
        return false;
      }

      // 2. Search query filter
      if (queryTokens.length === 0) return true;

      const searchableText = `${c.ueCode || ''} ${c.ueId || ''} ${c.title || ''} ${c.professor || ''} ${(c.tags || []).join(' ')}`;
      return matchesQuery(queryTokens, searchableText);
    });
  }, [courses, searchQuery, selectedUeFilter]);

  // Options list for navigation (index 0 is General if allowed, followed by filtered courses)
  const isGeneralMatching = useMemo(() => {
    if (!allowClear) return false;
    if (!searchQuery.trim()) return selectedUeFilter === 'ALL';
    const queryTokens = normalizeText(searchQuery).split(/\s+/).filter(Boolean);
    return matchesQuery(queryTokens, `general pass generaliste ${generalOptionLabel}`);
  }, [allowClear, searchQuery, selectedUeFilter, generalOptionLabel]);

  // Total selectable items in current view
  const selectableItemsCount = filteredCourses.length + (isGeneralMatching ? 1 : 0);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setHighlightedIndex(0);
    } else {
      setSearchQuery('');
      setSelectedUeFilter('ALL');
    }
  }, [isOpen]);

  // Handle keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'Escape') {
      setIsOpen(false);
      e.preventDefault();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % Math.max(1, selectableItemsCount));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + selectableItemsCount) % Math.max(1, selectableItemsCount));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isGeneralMatching && highlightedIndex === 0) {
        onSelectCourse('');
        setIsOpen(false);
      } else {
        const courseIdx = isGeneralMatching ? highlightedIndex - 1 : highlightedIndex;
        if (filteredCourses[courseIdx]) {
          onSelectCourse(filteredCourses[courseIdx].id);
          setIsOpen(false);
        }
      }
    }
  };

  // Scroll active item into view when highlightedIndex changes
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.querySelector('[data-highlighted="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div className={`relative ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${fullWidth ? 'w-full' : 'w-full sm:max-w-xs'} flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all shadow-2xs text-left ${
          isOpen
            ? 'border-sky-500 ring-2 ring-sky-500/20 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200'
        } ${buttonClassName}`}
        title={selectedCourse ? `[${selectedCourse.ueCode}] ${selectedCourse.title}` : generalOptionLabel}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {selectedCourse ? (
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              {selectedCourse.ueCode && (
                <span
                  className="px-1.5 py-0.2 rounded text-[9px] font-extrabold shrink-0 uppercase tracking-wider"
                  style={{
                    backgroundColor: selectedCourse.color || '#0284c7',
                    color: getContrastTextColor(selectedCourse.color || '#0284c7')
                  }}
                >
                  {selectedCourse.ueCode}
                </span>
              )}
              <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
                {selectedCourse.title}
              </span>
            </div>
          ) : (
            <span className="text-slate-600 dark:text-slate-400 truncate flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-sky-500 shrink-0" />
              <span>{generalOptionLabel}</span>
            </span>
          )}
        </div>

        <ChevronsUpDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-sky-500' : ''}`} />
      </button>

      {/* Floating Popover Combobox */}
      {isOpen && (
        <div
          className={`absolute ${dropdownPlacement === 'left' ? 'left-0' : 'right-0'} top-full mt-2 w-80 sm:w-96 max-w-[92vw] z-50 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleUp flex flex-col`}
        >
          {/* Search Input Bar */}
          <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-slate-50/70 dark:bg-slate-950/50">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick UE filter pill tabs (horizontal scrollable) */}
          {availableUes.length > 0 && (
            <div className="flex items-center gap-1 p-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-950/20 overflow-x-auto scrollbar-none text-[10px]">
              <button
                type="button"
                onClick={() => {
                  setSelectedUeFilter('ALL');
                  setHighlightedIndex(0);
                }}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all shrink-0 ${
                  selectedUeFilter === 'ALL'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/50'
                }`}
              >
                Toutes ({courses.length})
              </button>
              {availableUes.map(ue => {
                const count = courses.filter(c => c.ueCode?.toUpperCase() === ue).length;
                const isCurrent = selectedUeFilter === ue;
                return (
                  <button
                    key={ue}
                    type="button"
                    onClick={() => {
                      setSelectedUeFilter(isCurrent ? 'ALL' : ue);
                      setHighlightedIndex(0);
                    }}
                    className={`px-2 py-0.5 rounded-lg font-bold transition-all shrink-0 flex items-center gap-1 ${
                      isCurrent
                        ? 'bg-sky-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/50'
                    }`}
                  >
                    <span>{ue}</span>
                    <span className="text-[9px] opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Results List */}
          <div ref={listRef} className="max-h-64 overflow-y-auto p-1.5 space-y-1 scrollbar-thin">
            
            {/* General Context Option */}
            {isGeneralMatching && (
              <div
                data-highlighted={highlightedIndex === 0}
                onClick={() => {
                  onSelectCourse('');
                  setIsOpen(false);
                }}
                className={`group flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                  !selectedCourseId
                    ? 'bg-sky-50 dark:bg-sky-950/70 border border-sky-300 dark:border-sky-500/50 text-sky-950 dark:text-white font-bold'
                    : highlightedIndex === 0
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 font-medium'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-200 dark:border-sky-800/40">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs">{generalOptionLabel}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">Posez n'importe quelle question PASS transversale</div>
                  </div>
                </div>
                {!selectedCourseId && <Check className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />}
              </div>
            )}

            {/* Empty State */}
            {filteredCourses.length === 0 && !isGeneralMatching && (
              <div className="py-8 text-center space-y-2 px-3">
                <Layers className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Aucun cours trouvé pour <span className="font-bold text-slate-900 dark:text-white">« {searchQuery} »</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedUeFilter('ALL');
                  }}
                  className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Effacer les filtres
                </button>
              </div>
            )}

            {/* Filtered Courses List */}
            {filteredCourses.map((c, idx) => {
              const itemIdx = isGeneralMatching ? idx + 1 : idx;
              const isSelected = selectedCourseId === c.id;
              const isHighlighted = highlightedIndex === itemIdx;

              return (
                <div
                  key={c.id}
                  data-highlighted={isHighlighted}
                  onClick={() => {
                    onSelectCourse(c.id);
                    setIsOpen(false);
                  }}
                  className={`group flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-sky-50 dark:bg-sky-950/70 border border-sky-300 dark:border-sky-500/50 text-sky-950 dark:text-white font-bold'
                      : isHighlighted
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {c.ueCode ? (
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-extrabold shrink-0 uppercase tracking-wider shadow-2xs"
                        style={{
                          backgroundColor: c.color || '#0284c7',
                          color: getContrastTextColor(c.color || '#0284c7')
                        }}
                      >
                        {c.ueCode}
                      </span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className={`truncate ${isSelected ? 'font-extrabold' : 'font-medium'}`}>
                        {c.title}
                      </div>
                      {c.professor && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                          Pr. {c.professor}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 ml-2" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer with summary */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 px-3">
            <span>{filteredCourses.length} cours disponible{filteredCourses.length > 1 ? 's' : ''}</span>
            <span className="hidden sm:inline">↑↓ pour naviguer • Entrée pour choisir</span>
          </div>

        </div>
      )}
    </div>
  );
};

export default CourseCombobox;
