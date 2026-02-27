"use client"

import ReactMarkdown, { type Components } from "react-markdown"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

interface MessageMarkdownProps {
  content: string
  accent?: boolean
  className?: string
}

export default function MessageMarkdown({
  content,
  accent = false,
  className,
}: MessageMarkdownProps) {
  const components: Components = {
    p: ({ children }) => <p className="my-0 leading-relaxed">{children}</p>,
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "underline underline-offset-2 break-all",
          accent
            ? "text-white hover:text-white/90"
            : "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300",
        )}
      >
        {children}
      </a>
    ),
    ul: ({ children }) => <ul className="my-1 list-disc pl-5 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="my-1 list-decimal pl-5 space-y-1">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote
        className={cn(
          "my-2 border-l-2 pl-3 italic",
          accent ? "border-white/50 text-white/95" : "border-slate-300 dark:border-slate-600",
        )}
      >
        {children}
      </blockquote>
    ),
    code: ({ className: codeClassName, children, ...props }) => {
      const inline = !(codeClassName || "").includes("language-")
      if (inline) {
        return (
          <code
            className={cn(
              "rounded px-1 py-0.5 font-mono text-[0.85em]",
              accent
                ? "bg-white/20 text-white"
                : "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
            )}
            {...props}
          >
            {children}
          </code>
        )
      }

      return (
        <code className={cn("font-mono text-xs md:text-sm", accent ? "text-white" : "text-slate-100")} {...props}>
          {children}
        </code>
      )
    },
    pre: ({ children }) => (
      <pre
        className={cn(
          "my-2 overflow-x-auto rounded-lg p-3 font-mono text-xs md:text-sm",
          accent ? "bg-black/20 text-white" : "bg-slate-900 text-slate-100 dark:bg-slate-950",
        )}
      >
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div className="my-2 overflow-x-auto">
        <table
          className={cn(
            "w-full min-w-[420px] border-collapse text-left text-xs md:text-sm",
            accent ? "text-white" : "text-slate-800 dark:text-slate-100",
          )}
        >
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead
        className={cn(
          accent ? "bg-white/10" : "bg-slate-100 dark:bg-slate-700/60",
        )}
      >
        {children}
      </thead>
    ),
    th: ({ children }) => (
      <th
        className={cn(
          "border px-2 py-1.5 text-left font-semibold",
          accent ? "border-white/30" : "border-slate-200 dark:border-slate-600",
        )}
      >
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td
        className={cn(
          "border px-2 py-1.5 align-top",
          accent ? "border-white/20" : "border-slate-200 dark:border-slate-600",
        )}
      >
        {children}
      </td>
    ),
    hr: () => (
      <hr
        className={cn(
          "my-2 border-t",
          accent ? "border-white/30" : "border-slate-200 dark:border-slate-700",
        )}
      />
    ),
  }

  return (
    <div
      className={cn(
        "text-sm leading-relaxed break-words",
        accent ? "text-white" : "text-slate-900 dark:text-slate-100",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        skipHtml={true}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
