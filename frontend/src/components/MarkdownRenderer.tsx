import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { HIGHLIGHT_COLORS, getHighlightColor } from '../utils/richTextConverter';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={`markdown-content text-xs leading-relaxed space-y-3 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={{
          mark: ({ node, ...props }: any) => {
            const dataColor = props['data-color'] || props.dataColor || (props.className && props.className.match(/hl-([a-z]+)/)?.[1]) || 'yellow';
            const color = getHighlightColor(dataColor);
            return (
              <mark className={`${color.className} px-1 py-0.5 rounded font-medium`} {...props} />
            );
          },
          u: ({ node, ...props }: any) => (
            <u className="underline underline-offset-2" {...props} />
          ),
          h1: ({ node, ...props }) => (
            <h1 className="text-base font-extrabold text-slate-950 dark:text-white mt-4 mb-2 pb-1 border-b border-slate-200 dark:border-slate-800 tracking-tight" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-sm font-bold text-sky-700 dark:text-sky-300 mt-3 mb-1.5 flex items-center gap-1.5" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-2.5 mb-1" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-2 mb-1" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="text-slate-800 dark:text-slate-200 leading-relaxed mb-2 last:mb-0" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-outside pl-4 space-y-1 text-slate-800 dark:text-slate-200 my-2" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-outside pl-4 space-y-1 text-slate-800 dark:text-slate-200 my-2" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-slate-800 dark:text-slate-200 leading-normal pl-0.5" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-sky-500 bg-sky-50 dark:bg-sky-950/30 px-3 py-2 rounded-r-xl my-2 text-sky-900 dark:text-sky-200 italic" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 shadow-xs">
              <table className="w-full text-left text-xs border-collapse divide-y divide-slate-200 dark:divide-slate-800" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-900 dark:text-slate-200 font-bold text-[11px] uppercase tracking-wider" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60" {...props} />
          ),
          tr: ({ node, ...props }) => (
            <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-3 py-2.5 text-slate-900 dark:text-slate-200 font-extrabold border-b border-slate-200 dark:border-slate-800 text-[11px]" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-3 py-2 text-slate-800 dark:text-slate-300 align-top leading-snug border-slate-200 dark:border-slate-800/40" {...props} />
          ),
          pre: ({ node, ...props }) => (
            <pre className="my-2.5 rounded-xl bg-slate-900 dark:bg-slate-950 p-3 border border-slate-200 dark:border-slate-800 overflow-x-auto font-mono text-[11px] text-slate-100 dark:text-slate-200 leading-relaxed scrollbar-thin shadow-2xs" {...props} />
          ),
          code: ({ node, className, children, ...props }: any) => {
            const hasLang = /language-(\w+)/.test(className || '');
            const isMultiLine = typeof children === 'string' ? children.includes('\n') : Array.isArray(children) ? children.some(c => typeof c === 'string' && c.includes('\n')) : false;

            if (hasLang || isMultiLine) {
              return (
                <code className={`${className || ''} font-mono block`} {...props}>
                  {children}
                </code>
              );
            }

            return (
              <code className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-100 dark:bg-slate-900 font-mono text-[11px] text-sky-700 dark:text-sky-300 border border-slate-200/90 dark:border-slate-800 font-semibold inline" {...props}>
                {children}
              </code>
            );
          },
          strong: ({ node, ...props }) => (
            <strong className="font-extrabold text-slate-950 dark:text-white" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="italic text-slate-900 dark:text-slate-200" {...props} />
          ),
          hr: ({ node, ...props }) => (
            <hr className="my-3 border-slate-200 dark:border-slate-800" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a className="text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 underline underline-offset-2 font-medium" target="_blank" rel="noopener noreferrer" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
