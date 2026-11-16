import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const isSafeHref = (href) => typeof href === "string" && /^https?:\/\//i.test(href.trim());

/**
 * Renderiza mensagens de chat em Markdown (GFM) com segurança (sem HTML bruto)
 * e contraste adaptado tanto às bolhas do usuário quanto às do Teco.
 */
export default function MarkdownMessage({ content, isUser = false }) {
  const inlineCodeCls = isUser
    ? "bg-white/20 dark:bg-slate-900/15 text-white dark:text-slate-900 px-1.5 py-0.5 rounded text-[0.85em] font-mono"
    : "bg-slate-200/80 dark:bg-slate-900/80 text-emerald-800 dark:text-lime-spark px-1.5 py-0.5 rounded text-[0.85em] font-mono";

  const preCls = isUser
    ? "bg-emerald-700/80 dark:bg-slate-900/15 text-white dark:text-slate-900 p-3 rounded-xl overflow-x-auto text-xs my-2 font-mono"
    : "bg-slate-900 text-slate-100 p-3 rounded-xl overflow-x-auto text-xs my-2 font-mono border border-slate-700";

  const quoteCls = isUser
    ? "border-l-2 border-white/60 dark:border-slate-900/40 pl-3 italic my-2 opacity-95"
    : "border-l-2 border-emerald-500 dark:border-lime-spark pl-3 italic my-2 text-slate-600 dark:text-slate-300";

  const tableBorderCls = isUser
    ? "border-white/25 dark:border-slate-900/20"
    : "border-slate-300 dark:border-slate-700";

  return (
    <div className="text-sm break-words min-w-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 leading-relaxed whitespace-pre-line">{children}</p>
          ),
          h1: ({ children }) => <h3 className="text-base font-bold mt-3 mb-1.5">{children}</h3>,
          h2: ({ children }) => <h4 className="text-sm font-bold mt-2.5 mb-1">{children}</h4>,
          h3: ({ children }) => <h5 className="text-sm font-semibold mt-2 mb-1">{children}</h5>,
          ul: ({ children }) => <ul className="list-disc pl-5 my-1.5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 my-1.5 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          blockquote: ({ children }) => <blockquote className={quoteCls}>{children}</blockquote>,
          hr: () => <hr className={`my-2.5 border-t ${tableBorderCls}`} />,
          pre: ({ children }) => <pre className={preCls}>{children}</pre>,
          code: ({ className, children, ...props }) => {
            const isBlock = Boolean(className && className.includes("language-"));
            if (isBlock) {
              return (
                <code className="font-mono text-xs" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className={inlineCodeCls} {...props}>
                {children}
              </code>
            );
          },
          a: ({ href, children }) =>
            isSafeHref(href) ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`underline font-semibold ${
                  isUser ? "text-inherit" : "text-emerald-700 dark:text-lime-spark"
                }`}
              >
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className={`min-w-full text-xs border-collapse border ${tableBorderCls}`}>
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className={`border ${tableBorderCls} px-2.5 py-1.5 text-left font-bold`}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className={`border ${tableBorderCls} px-2.5 py-1.5`}>{children}</td>
          ),
        }}
      >
        {String(content || "")}
      </ReactMarkdown>
    </div>
  );
}
