"use client";

import React, { useMemo } from "react";
import { RICH_MARKER } from "./article-rich-editor";

const TAGS = new Set(["DIV", "P", "BR", "STRONG", "B", "EM", "I", "U", "H2", "H3", "UL", "OL", "LI", "BLOCKQUOTE", "A"]);

function safeNodes(root: ParentNode): React.ReactNode[] {
  return Array.from(root.childNodes).map((node, i): React.ReactNode => {
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeType !== 1) return null;
    const el = node as Element;
    const children = safeNodes(el);
    if (!TAGS.has(el.tagName)) return <React.Fragment key={i}>{children}</React.Fragment>;
    const tag = el.tagName.toLowerCase();
    const props: Record<string, unknown> = { key: i };
    if (tag === "a") {
      const href = el.getAttribute("href") || "";
      try {
        const url = new URL(href, window.location.origin);
        if (url.protocol === "https:" || url.protocol === "http:") {
          props.href = url.href;
          props.rel = "noopener noreferrer";
          props.target = "_blank";
        }
      } catch { /* no link */ }
      if (!props.href) return <React.Fragment key={i}>{children}</React.Fragment>;
    }
    return React.createElement(tag, props, ...children);
  });
}

export function ArticleRichBody({ body }: { body?: string | null }) {
  const nodes = useMemo(() => {
    if (!body?.startsWith(RICH_MARKER) || typeof window === "undefined") return null;
    const doc = new DOMParser().parseFromString(body.slice(RICH_MARKER.length), "text/html");
    return safeNodes(doc.body);
  }, [body]);
  if (!body?.startsWith(RICH_MARKER)) return <div className="whitespace-pre-wrap">{body || ""}</div>;
  return <div dir="rtl" className="break-words [&_h2]:my-3 [&_h2]:text-[1.4em] [&_h2]:font-bold [&_h3]:my-2 [&_h3]:text-[1.2em] [&_h3]:font-bold [&_p]:my-2 [&_a]:text-amber-300 [&_a]:underline [&_ul]:my-2 [&_ul]:list-disc [&_ol]:my-2 [&_ol]:list-decimal [&_ul]:pr-6 [&_ol]:pr-6">{nodes}</div>;
}
