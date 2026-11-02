import type { ReactNode } from 'react'

/** Keeps each runnable example beside its API, expected output, and minimal snippet. */
export function DemoCard({ id, title, api, description, output, code, children }: {
  id: string
  title: string
  api: string
  description: string
  output: string
  code: string
  children: ReactNode
}) {
  return (
    <article className="demo-card" id={id} aria-labelledby={`${id}-title`}>
      <div className="card-heading">
        <span className="api-label">{api}</span>
        <h3 id={`${id}-title`}>{title}</h3>
      </div>
      <p>{description}</p>
      <div className="demo-controls">{children}</div>
      <p className="output-label">Look for: <code>{output}</code></p>
      <details className="sample-code">
        <summary>View simple sample</summary>
        <pre><code>{code}</code></pre>
      </details>
    </article>
  )
}
