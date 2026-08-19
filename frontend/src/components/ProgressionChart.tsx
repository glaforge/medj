import React, { useState } from 'react';
import { QcmAttempt } from '../types';
import { TrendingUp, Award, Clock, Target, Calendar, CheckCircle2 } from 'lucide-react';
import { parseDate, formatDateTime, formatPoints } from '../utils/dateUtils';

interface ProgressionChartProps {
  attempts: QcmAttempt[];
  title?: string;
  subtitle?: string;
  height?: number;
}

export const ProgressionChart: React.FC<ProgressionChartProps> = ({
  attempts,
  title = "Courbe d'Apprentissage & Progression",
  subtitle = "Évolution de vos scores au fil des entraînements QCM",
  height = 180
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!attempts || attempts.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800 text-center space-y-2">
        <Target className="w-8 h-8 text-sky-400 mx-auto opacity-70" />
        <h4 className="text-xs font-bold text-slate-200">Aucune tentative de QCM enregistrée pour l'instant</h4>
        <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
          Passez votre premier entraînement aux QCMs pour tracer votre courbe d'apprentissage et mesurer vos progrès vers le concours.
        </p>
      </div>
    );
  }

  // Sort chronologically
  const sorted = [...attempts].sort((a, b) => {
    const da = a.completedAt ? parseDate(a.completedAt).getTime() : 0;
    const db = b.completedAt ? parseDate(b.completedAt).getTime() : 0;
    return da - db;
  });

  const scores = sorted.map(a => a.scorePercent);
  const latestScore = scores[scores.length - 1];
  const bestScore = Math.max(...scores);
  const avgScore = Math.round(scores.reduce((acc, v) => acc + v, 0) / scores.length);
  const firstScore = scores[0];
  const delta = latestScore - firstScore;

  // Chart dimensions & scaling
  const width = 600;
  const paddingX = 45;
  const paddingY = 25;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Calculate coordinates for points
  const points = sorted.map((att, idx) => {
    const x = sorted.length === 1
      ? paddingX + chartWidth / 2
      : paddingX + (idx / (sorted.length - 1)) * chartWidth;
    // Map score 0-100 to y (100 at top, 0 at bottom)
    const y = paddingY + chartHeight - (att.scorePercent / 100) * chartHeight;
    return { x, y, attempt: att, idx };
  });

  // Construct SVG path string
  let pathD = "";
  let areaD = "";
  if (points.length === 1) {
    pathD = `M ${points[0].x - 20} ${points[0].y} L ${points[0].x + 20} ${points[0].y}`;
    areaD = `M ${points[0].x - 20} ${paddingY + chartHeight} L ${points[0].x - 20} ${points[0].y} L ${points[0].x + 20} ${points[0].y} L ${points[0].x + 20} ${paddingY + chartHeight} Z`;
  } else {
    pathD = points.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, "");
    areaD = `${pathD} L ${points[points.length - 1].x} ${paddingY + chartHeight} L ${points[0].x} ${paddingY + chartHeight} Z`;
  }

  // 80% threshold line Y position
  const target80Y = paddingY + chartHeight - (80 / 100) * chartHeight;
  const target50Y = paddingY + chartHeight - (50 / 100) * chartHeight;

  return (
    <div className="space-y-4">
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              {title}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-sky-400 border border-slate-800">
              {attempts.length} tentative{attempts.length > 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        {/* Quick KPI badges */}
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-right">
            <div className="text-[9px] font-bold text-slate-400 uppercase">Dernier</div>
            <div className={`text-xs font-extrabold ${latestScore >= 80 ? 'text-emerald-400' : latestScore >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
              {latestScore}%
            </div>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-right">
            <div className="text-[9px] font-bold text-slate-400 uppercase">Record</div>
            <div className="text-xs font-extrabold text-sky-400">
              {bestScore}%
            </div>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-right">
            <div className="text-[9px] font-bold text-slate-400 uppercase">Moyenne</div>
            <div className="text-xs font-extrabold text-slate-200">
              {avgScore}%
            </div>
          </div>

          {sorted.length > 1 && (
            <div className="px-2.5 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-right">
              <div className="text-[9px] font-bold text-slate-400 uppercase">Évolution</div>
              <div className={`text-xs font-extrabold ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {delta > 0 ? `+${delta}%` : `${delta}%`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SVG Chart Canvas */}
      <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 relative overflow-hidden shadow-inner">
        
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            {/* Gradient for area under curve */}
            <linearGradient id="progressionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
            </linearGradient>
            
            {/* Glow filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="#334155"
            strokeDasharray="2 4"
            strokeWidth="0.8"
          />
          <text x={paddingX - 8} y={paddingY + 3} textAnchor="end" className="text-[9px] fill-slate-500 font-mono font-bold">100%</text>

          {/* 80% Success target line */}
          <line
            x1={paddingX}
            y1={target80Y}
            x2={width - paddingX}
            y2={target80Y}
            stroke="#10b981"
            strokeDasharray="4 4"
            strokeWidth="1"
            opacity="0.5"
          />
          <text x={width - paddingX - 6} y={target80Y - 4} textAnchor="end" className="text-[8.5px] fill-emerald-500 dark:fill-emerald-400 font-mono font-bold">🎯 80% (Cible PASS)</text>

          {/* 50% line */}
          <line
            x1={paddingX}
            y1={target50Y}
            x2={width - paddingX}
            y2={target50Y}
            stroke="#334155"
            strokeDasharray="2 4"
            strokeWidth="0.8"
          />
          <text x={paddingX - 8} y={target50Y + 3} textAnchor="end" className="text-[9px] fill-slate-500 font-mono font-bold">50%</text>

          {/* Bottom baseline */}
          <line
            x1={paddingX}
            y1={paddingY + chartHeight}
            x2={width - paddingX}
            y2={paddingY + chartHeight}
            stroke="#334155"
            strokeWidth="1"
          />
          <text x={paddingX - 8} y={paddingY + chartHeight + 3} textAnchor="end" className="text-[9px] fill-slate-500 font-mono font-bold">0%</text>

          {/* Area Fill */}
          <path d={areaD} fill="url(#progressionGradient)" />

          {/* Main Curve Stroke */}
          <path
            d={pathD}
            fill="none"
            stroke="#34d399"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {/* Data Points */}
          {points.map((pt, idx) => {
            const isHovered = hoveredIdx === idx;
            const scoreColor = pt.attempt.scorePercent >= 80 ? '#10b981' : pt.attempt.scorePercent >= 50 ? '#f59e0b' : '#f43f5e';

            return (
              <g
                key={idx}
                className="cursor-pointer transition-transform"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Outer halo */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 8 : 5}
                  fill={scoreColor}
                  fillOpacity={isHovered ? 0.4 : 0.2}
                  className="transition-all duration-200"
                />
                {/* Core dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5 : 3.5}
                  fill={scoreColor}
                  stroke="#0f172a"
                  strokeWidth="2"
                  className="transition-all duration-200"
                />
                {/* X Axis Attempt Label */}
                <text
                  x={pt.x}
                  y={paddingY + chartHeight + 14}
                  textAnchor="middle"
                  className={`text-[8px] font-mono transition-all ${isHovered ? 'fill-emerald-400 font-bold' : 'fill-slate-500'}`}
                >
                  T{idx + 1}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip when hovering a point */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <div
            className="absolute z-20 pointer-events-none p-2.5 rounded-xl bg-slate-900/95 border border-slate-700 shadow-xl backdrop-blur-md text-xs space-y-1 transform -translate-x-1/2 -translate-y-full animate-scaleUp"
            style={{
              left: `${(points[hoveredIdx].x / width) * 100}%`,
              top: `${(points[hoveredIdx].y / height) * 100}%`,
              marginTop: '-12px'
            }}
          >
            <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 border-b border-slate-800 pb-1">
              <span>Tentative #{hoveredIdx + 1}</span>
              <span>
                {points[hoveredIdx].attempt.completedAt
                  ? formatDateTime(points[hoveredIdx].attempt.completedAt)
                  : 'Récemment'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 pt-0.5">
              <span className="font-extrabold text-sm text-emerald-400">
                {points[hoveredIdx].attempt.scorePercent}%
              </span>
              <span className="text-[11px] font-mono text-slate-200">
                {formatPoints(points[hoveredIdx].attempt.totalPoints)} / {formatPoints(points[hoveredIdx].attempt.maxPoints)} pts
              </span>
            </div>

            <div className="text-[10px] text-slate-400 flex items-center gap-2">
              <span>{points[hoveredIdx].attempt.totalQuestions} questions</span>
              {points[hoveredIdx].attempt.timeSpentSeconds > 0 && (
                <span>• {Math.floor(points[hoveredIdx].attempt.timeSpentSeconds / 60)}m {points[hoveredIdx].attempt.timeSpentSeconds % 60}s</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Attempt History List (Collapsible / Scannable) */}
      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
          Historique des sessions :
        </div>
        {sorted.slice().reverse().map((att, idx) => {
          const attemptNumber = sorted.length - idx;
          const isPassed = att.scorePercent >= 80;

          return (
            <div
              key={att.id || idx}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-slate-900 text-sky-400 font-bold flex items-center justify-center text-[10px] border border-slate-800">
                  #{attemptNumber}
                </span>
                <div>
                  <div className="text-slate-200 font-medium flex items-center gap-1.5">
                    <span>{att.courseTitle || 'QCM PASS'}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({att.ueCode})</span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {att.completedAt
                        ? formatDateTime(att.completedAt)
                        : 'Aujourd\'hui'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[11px] font-mono text-slate-300">
                    {formatPoints(att.totalPoints)} / {formatPoints(att.maxPoints)} pts
                  </div>
                  <div className="text-[9px] text-slate-500">
                    {att.totalQuestions} questions
                  </div>
                </div>

                <div className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                  isPassed
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                    : att.scorePercent >= 50
                    ? 'bg-amber-950 text-amber-400 border border-amber-800/40'
                    : 'bg-rose-950 text-rose-400 border border-rose-800/40'
                }`}>
                  {att.scorePercent}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
