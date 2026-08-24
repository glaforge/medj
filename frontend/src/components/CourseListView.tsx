import React, { useState } from 'react';
import { Course, SubjectUE } from '../types';
import { getContrastTextColor } from '../utils/colorUtils';
import { DeleteCourseModal } from './DeleteCourseModal';
import { DeleteSubjectModal } from './DeleteSubjectModal';
import {
  BookOpen,
  Plus,
  Search,
  FileText,
  Clock,
  Sparkles,
  Layers,
  CheckCircle2,
  Trash2,
  Filter,
  Edit3,
  FolderOpen,
  Award,
  Settings2,
  Tag
} from 'lucide-react';

interface CourseListViewProps {
  courses: Course[];
  subjects: SubjectUE[];
  onSelectCourse: (course: Course) => void;
  onOpenNewCourseModal: (initialUeId?: string) => void;
  onDeleteCourse: (courseId: string) => void;
  onOpenEditSubjectModal?: (subject?: SubjectUE) => void;
  onDeleteSubject?: (subjectId: string) => void;
}

export const CourseListView: React.FC<CourseListViewProps> = ({
  courses,
  subjects,
  onSelectCourse,
  onOpenNewCourseModal,
  onDeleteCourse,
  onOpenEditSubjectModal,
  onDeleteSubject
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'subjects' | 'courses'>('subjects');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUe, setSelectedUe] = useState('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState<number | 'ALL'>('ALL');
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<SubjectUE | null>(null);

  const getSubject = (ueId: string) => {
    if (!ueId) return undefined;
    return subjects.find(s => s.id.toLowerCase() === ueId.toLowerCase() || s.code.toLowerCase() === ueId.toLowerCase());
  };

  const getCoursesCountForUe = (ue: SubjectUE) => {
    return courses.filter(c => c.ueId.toLowerCase() === ue.id.toLowerCase() || c.ueCode?.toLowerCase() === ue.code.toLowerCase()).length;
  };

  const handleFilterBySubject = (subject: SubjectUE) => {
    setSelectedUe(subject.id);
    setActiveSubTab('courses');
    setSearchQuery('');
    setDifficultyFilter('ALL');
  };

  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.professor && c.professor.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const targetSubject = getSubject(selectedUe);
    const matchesUe = selectedUe === 'ALL' ||
      c.ueId.toLowerCase() === selectedUe.toLowerCase() ||
      c.ueCode?.toLowerCase() === selectedUe.toLowerCase() ||
      (targetSubject && (
        c.ueId.toLowerCase() === targetSubject.id.toLowerCase() ||
        c.ueId.toLowerCase() === targetSubject.code.toLowerCase() ||
        c.ueCode?.toLowerCase() === targetSubject.code.toLowerCase()
      ));

    const matchesDiff = difficultyFilter === 'ALL' || c.difficulty === difficultyFilter;

    return matchesSearch && matchesUe && matchesDiff;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Header with Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-5 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-sky-500 dark:text-sky-400 shrink-0" />
              <span>Catalogue des Matières & Cours PASS</span>
            </h1>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {subjects.length} UEs configurées • {courses.length} cours enregistrés • Suivi des cycles de mémorisation
          </p>
        </div>

        {/* View mode switcher & Primary actions */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('subjects')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'subjects'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Gestion des UEs ({subjects.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('courses')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'courses'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Cours ({courses.length})</span>
            </button>
          </div>

          {activeSubTab === 'subjects' ? (
            <div className="flex items-center gap-2">
              {onOpenEditSubjectModal && (
                <button
                  onClick={() => onOpenEditSubjectModal()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-900/30 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Nouvelle UE / Matière</span>
                </button>
              )}
              <button
                onClick={() => onOpenNewCourseModal(selectedUe !== 'ALL' ? selectedUe : undefined)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-sky-400" />
                <span>+ Cours (J0)</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => onOpenNewCourseModal(selectedUe !== 'ALL' ? selectedUe : undefined)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-lg shadow-sky-900/30 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Ajouter un cours (J0)</span>
            </button>
          )}
        </div>
      </div>

      {/* SUB-TAB 1: UE & SUBJECTS MANAGEMENT */}
      {activeSubTab === 'subjects' && (
        <div className="space-y-4 animate-fadeIn">
          {subjects.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 shadow-xs">
              <Layers className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Aucune UE / Matière configurée</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Vous démarrez sans données pré-installées. Créez vos propres matières (UE1, UE2, Mineure...) ou chargez le modèle PASS officiel.
              </p>
              <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
                {onOpenEditSubjectModal && (
                  <button
                    onClick={() => onOpenEditSubjectModal()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-md shadow-emerald-950/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Créer ma première UE / Matière</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map(subject => {
              const count = getCoursesCountForUe(subject);
              const color = subject.color || '#0284c7';

              return (
                <div
                  key={subject.id}
                  onClick={() => handleFilterBySubject(subject)}
                  className="glass-panel rounded-2xl p-5 border border-slate-800/90 hover:border-sky-500/60 hover:shadow-lg hover:shadow-sky-950/20 cursor-pointer transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    {/* Top line: Code badge + ECTS */}
                    <div className="flex items-center justify-between">
                      <span
                        className="px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider shadow-sm"
                        style={{ backgroundColor: color, color: getContrastTextColor(color) }}
                      >
                        {subject.code}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300">
                          {subject.coefficient ?? subject.ects ?? 10} ECTS
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-sky-950/60 border border-sky-800/30 text-[10px] font-bold text-sky-400">
                          {count} cours
                        </span>
                      </div>
                    </div>

                    {/* Subject Name */}
                    <div>
                      <h3 className="text-base font-extrabold text-white group-hover:text-sky-300 transition-colors">
                        {subject.name}
                      </h3>
                      {subject.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {subject.description}
                        </p>
                      )}
                    </div>

                    {/* Default J steps */}
                    {((subject.customIntervals || subject.defaultIntervals) && (subject.customIntervals || subject.defaultIntervals)!.length > 0) && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Rythme des J par défaut :</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(subject.customIntervals || subject.defaultIntervals)!.map((j) => (
                            <span
                              key={j}
                              className="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300"
                            >
                              J{j}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action link */}
                    <div className="pt-2 flex items-center justify-between text-xs text-sky-400 font-bold group-hover:translate-x-0.5 transition-all">
                      <span>Voir les {count} cours de {subject.code}</span>
                      <span className="text-sm font-bold">→</span>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="font-mono">{color}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenNewCourseModal(subject.id);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-950/50 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-800/40 text-xs font-semibold transition-all cursor-pointer"
                        title={`Ajouter un cours pour ${subject.code}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Cours</span>
                      </button>

                      {onOpenEditSubjectModal && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenEditSubjectModal(subject);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-300 hover:text-white border border-slate-800 text-xs font-semibold transition-all cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Modifier</span>
                        </button>
                      )}

                      {onDeleteSubject && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSubjectToDelete(subject);
                          }}
                          className="p-1.5 rounded-xl bg-rose-950/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 transition-all cursor-pointer"
                          title="Supprimer cette UE"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: COURSES CATALOGUE */}
      {activeSubTab === 'courses' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Search & Filters */}
          <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              
              {/* Search bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher par titre, mot-clé, professeur (ex: Plexus, Clairance, Dupuis)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* UE Filter */}
              <select
                value={selectedUe}
                onChange={(e) => setSelectedUe(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">Toutes les UEs</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>

              {/* Difficulty filter */}
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">Toutes difficultés</option>
                <option value={1}>Difficulté : 1 (Facile)</option>
                <option value={2}>Difficulté : 2</option>
                <option value={3}>Difficulté : 3 (Moyen)</option>
                <option value={4}>Difficulté : 4 (Difficile)</option>
                <option value={5}>Difficulté : 5 (Très lourd / Concours)</option>
              </select>
            </div>

            {/* Active UE Filter indicator */}
            {selectedUe !== 'ALL' && (
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="text-slate-400">UE sélectionnée :</span>
                <span
                  className="px-2.5 py-1 rounded-lg font-extrabold flex items-center gap-1.5 shadow-xs"
                  style={{
                    backgroundColor: getSubject(selectedUe)?.color || '#0284c7',
                    color: getContrastTextColor(getSubject(selectedUe)?.color || '#0284c7')
                  }}
                >
                  <span>{getSubject(selectedUe)?.code} - {getSubject(selectedUe)?.name}</span>
                  <button
                    onClick={() => setSelectedUe('ALL')}
                    className="hover:bg-black/20 rounded-full w-4 h-4 flex items-center justify-center text-[10px] ml-1 cursor-pointer transition-colors"
                    title="Effacer le filtre UE"
                  >
                    ✕
                  </button>
                </span>
                <button
                  onClick={() => setSelectedUe('ALL')}
                  className="text-slate-400 hover:text-white underline text-[11px] cursor-pointer"
                >
                  Afficher toutes les UEs ({courses.length})
                </button>
              </div>
            )}
          </div>

          {/* Courses Grid */}
          {filteredCourses.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800">
              <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-300">Aucun cours ne correspond à votre recherche</h3>
              <p className="text-xs text-slate-500 mt-1">
                Essayez de modifier vos filtres ou ajoutez votre premier cours $J_0$.
              </p>
              <button
                onClick={() => onOpenNewCourseModal(selectedUe !== 'ALL' ? selectedUe : undefined)}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white cursor-pointer"
              >
                + Ajouter un cours
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCourses.map(course => {
                const subject = getSubject(course.ueId);
                const color = course.color || (subject ? subject.color : '#0284c7');

                return (
                  <div
                    key={course.id}
                    onClick={() => onSelectCourse(course)}
                    className="glass-panel rounded-2xl p-5 border border-slate-800/90 hover:border-sky-500/60 hover:shadow-lg hover:shadow-sky-950/20 cursor-pointer transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* UE tag & Difficulty badge */}
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider shadow-xs"
                          style={{ backgroundColor: color, color: getContrastTextColor(color) }}
                        >
                          {course.ueCode || subject?.code || 'UE'}
                        </span>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span
                              key={i}
                              className={`text-xs ${
                                i < course.difficulty ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Course Title */}
                      <h3 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-2 leading-snug mb-2">
                        {course.title}
                      </h3>

                      {/* Professor & Taught Date */}
                      <div className="space-y-1 text-xs text-slate-400 mb-3">
                        {course.professor && (
                          <p className="truncate">Prof : {course.professor}</p>
                        )}
                        <p className="text-[11px] text-slate-500">
                          Date du cours : {course.taughtDate}
                        </p>
                      </div>

                      {/* Tags */}
                      {course.tags && course.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {course.tags.slice(0, 3).map((tag, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-300"
                            >
                              #{tag}
                            </span>
                          ))}
                          {course.tags.length > 3 && (
                            <span className="text-[10px] text-slate-500 self-center">
                              +{course.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer with Doc count & Action */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          {course.documents ? course.documents.length : 0} doc(s)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCourseToDelete(course);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Supprimer ce cours"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sky-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                          Voir la fiche →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Delete Course Modal */}
      <DeleteCourseModal
        isOpen={courseToDelete !== null}
        onClose={() => setCourseToDelete(null)}
        course={courseToDelete}
        subject={courseToDelete ? getSubject(courseToDelete.ueId) : undefined}
        onConfirmDelete={(id) => onDeleteCourse(id)}
      />

      {/* Delete Subject Modal */}
      <DeleteSubjectModal
        isOpen={subjectToDelete !== null}
        onClose={() => setSubjectToDelete(null)}
        subject={subjectToDelete}
        coursesCount={subjectToDelete ? getCoursesCountForUe(subjectToDelete) : 0}
        onConfirmDelete={async (id) => {
          if (onDeleteSubject) {
            await onDeleteSubject(id);
          }
        }}
      />

    </div>
  );
};
export default CourseListView;
