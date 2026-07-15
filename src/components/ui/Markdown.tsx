import { Fragment, type ReactElement } from "react";
import { cn } from "@/lib/cn";

/** Render inline **bold** within a line. */
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-semibold text-fg">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    )
  );
}

/**
 * Tiny markdown renderer — handles headings, bullet/numbered lists, bold and
 * paragraphs. Enough for the AI's summaries without pulling in a markdown dep.
 */
export default function Markdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const lines = content.split(/\r?\n/);
  const blocks: ReactElement[] = [];
  let list: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let key = 0;

  const flush = () => {
    if (!list.length) return;
    const items = list.map((t, i) => (
      <li key={i} className="ml-1">
        {inline(t)}
      </li>
    ));
    blocks.push(
      listType === "ol" ? (
        <ol key={key++} className="list-decimal space-y-1.5 pl-5 marker:text-accent-soft">
          {items}
        </ol>
      ) : (
        <ul key={key++} className="list-disc space-y-1.5 pl-5 marker:text-accent-soft">
          {items}
        </ul>
      )
    );
    list = [];
    listType = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      flush();
      blocks.push(
        <h4 key={key++} className="mt-2 text-sm font-semibold text-fg">
          {inline(line.replace(/^#{1,6}\s/, ""))}
        </h4>
      );
      continue;
    }
    const ol = line.match(/^\d+\.\s+(.*)/);
    const ul = line.match(/^[-*]\s+(.*)/);
    if (ol) {
      if (listType === "ul") flush();
      listType = "ol";
      list.push(ol[1]);
      continue;
    }
    if (ul) {
      if (listType === "ol") flush();
      listType = "ul";
      list.push(ul[1]);
      continue;
    }
    flush();
    blocks.push(
      <p key={key++} className="leading-relaxed">
        {inline(line)}
      </p>
    );
  }
  flush();

  return (
    <div className={cn("space-y-2.5 text-sm leading-relaxed text-fg/80", className)}>
      {blocks}
    </div>
  );
}
