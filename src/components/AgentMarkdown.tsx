// KiteDesk | render agent LLM output as GitHub-Flavored Markdown (tables, lists, etc.)
'use client'

import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

export type AgentMarkdownProps = {
  content: string
  className?: string
}

const md: Partial<Components> = {
  h1: ({ children, ...props }) => (
    <h1
      className="mt-5 border-b border-slate-200 pb-2 font-sans text-lg font-bold text-slate-900 first:mt-0"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="mt-4 font-sans text-base font-bold text-slate-900 first:mt-0"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className="mt-3 font-sans text-sm font-semibold text-slate-900 first:mt-0"
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4
      className="mt-3 font-sans text-sm font-semibold text-slate-800 first:mt-0"
      {...props}
    >
      {children}
    </h4>
  ),
  p: ({ children, ...props }) => (
    <p
      className="my-2 font-sans text-sm leading-relaxed text-slate-800 last:mb-0"
      {...props}
    >
      {children}
    </p>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-slate-900" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic text-slate-800" {...props}>
      {children}
    </em>
  ),
  ul: ({ children, ...props }) => (
    <ul
      className="my-2 list-disc space-y-1 pl-5 font-sans text-sm text-slate-800"
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol
      className="my-2 list-decimal space-y-1 pl-5 font-sans text-sm text-slate-800"
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-relaxed" {...props}>
      {children}
    </li>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="my-3 border-l-4 border-emerald-500/60 bg-emerald-50/50 py-1 pl-3 font-sans text-sm text-slate-700"
      {...props}
    >
      {children}
    </blockquote>
  ),
  hr: (props) => <hr className="my-4 border-slate-200" {...props} />,
  a: ({ href, children, ...props }) => {
    const external = typeof href === 'string' && /^https?:\/\//i.test(href)
    return (
      <a
        href={href}
        className="font-medium text-emerald-800 underline decoration-emerald-600/40 underline-offset-2 transition hover:text-emerald-900 hover:decoration-emerald-700"
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        {...props}
      >
        {children}
      </a>
    )
  },
  table: ({ children, ...props }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-slate-200">
      <table
        className="w-full min-w-[520px] border-collapse font-sans text-xs sm:text-sm"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-slate-100 text-left text-slate-700" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }) => (
    <tbody className="divide-y divide-slate-100 bg-white" {...props}>
      {children}
    </tbody>
  ),
  tr: ({ children, ...props }) => (
    <tr className="border-b border-slate-100 last:border-0" {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }) => (
    <th className="whitespace-normal px-3 py-2 font-semibold text-slate-900" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="whitespace-normal px-3 py-2 align-top text-slate-800" {...props}>
      {children}
    </td>
  ),
  pre: ({ children, ...props }) => (
    <pre
      className="my-3 overflow-x-auto rounded-lg border border-slate-200 bg-slate-900 p-3 font-mono text-xs text-slate-100"
      {...props}
    >
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const inline = !className
    if (inline) {
      return (
        <code
          className="rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-900"
          {...props}
        >
          {children}
        </code>
      )
    }
    return (
      <code
        className={`font-mono text-xs text-slate-100 ${className || ''}`}
        {...props}
      >
        {children}
      </code>
    )
  },
}

export function AgentMarkdown({ content, className }: AgentMarkdownProps) {
  return (
    <div
      className={
        className ??
        'max-h-[min(50dvh,480px)] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 sm:max-h-[min(60vh,560px)] sm:p-4'
      }
    >
      <Markdown remarkPlugins={[remarkGfm]} components={md} skipHtml>
        {content}
      </Markdown>
    </div>
  )
}
