"use client";

import React, { useMemo } from "react";
import { RICH_MARKER } from "./article-rich-editor";

const TAGS = new Set(["DIV", "P", "BR", "STRONG", "B", "EM", "I", "U", "H2", "H3", "UL", "OL", "LI", "BLOCKQUOTE", "A", "IMG"]);

function safeNodes(root: ParentNode): React.ReactNode[] {
  return Array.from(root.childNodes).map((node, i): React.ReactNode => {
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeType !== 1) return null;
    const el = node as Element;
    const children = safeNodes(el);
    if (!TAGS.has(el.tagName)) return <React.Fragment key={i}>{children}</React.Fragment>;
    const tag = el.tagName.toLowerCase();
    const props: Record<string, unknown> = { key: i };
    if (tag === "img") {
      const src = el.getAttribute("src") || "";
      if (!/^https:\/\/mashkeeza-cms-api\.smilingshaaaam\.workers\.dev\/media\/[0-9a-f-]{36}$/.test(src)) return null;
      const width = Number(el.getAttribute("width"));
      const height = Number(el.getAttribute("height"));
      const align = el.getAttribute("data-align") || "center";
      const validWidth = Number.isInteger(width) && width >= 20 && width <= 2000 ? width : undefined;
      const validHeight = Number.isInteger(height) && height >= 20 && height <= 2000 ? height : undefined;
      const bounded = (name: string, min: number, max: number, fallback: number) => {
        const raw = el.getAttribute(name);
        const n = raw === null ? fallback : Number(raw);
        return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
      };
      const percent = bounded("data-size", 10, 100, 0);
      const x = bounded("data-x", 0, 100, 50);
      const effect = el.getAttribute("data-effect") || "original";
      const opacity = bounded("data-opacity", 30, 100, 100) / 100;
      const wrapped = align === "left" || align === "right";
      const free = align === "free" && percent > 0;
      const style: React.CSSProperties = {
        maxWidth: wrapped ? "calc(100% - 0.65em)" : align === "inline" ? "calc(100% - 0.5em)" : "100%",
        width: percent ? percent + "%" : validWidth ? validWidth + "px" : "auto",
        height: percent ? "auto" : validHeight ? validHeight + "px" : "auto",
        aspectRatio: validWidth && validHeight ? validWidth + " / " + validHeight : undefined,
        display: align === "inline" ? "inline-block" : "block",
        float: wrapped ? align : undefined,
        clear: align === "center" || free ? "both" : undefined,
        margin: align === "left" ? "0.35em 0.65em 0.35em 0" : align === "right" ? "0.35em 0 0.35em 0.65em" : align === "inline" ? "0 .25em" : "0.6em auto",
        marginLeft: free ? ((100 - percent) * x / 100) + "%" : undefined,
        marginRight: free ? ((100 - percent) * (100 - x) / 100) + "%" : undefined,
        objectFit: "contain",
        verticalAlign: "middle",
        breakInside: "avoid",
        opacity,
        mixBlendMode: effect === "ink" || effect === "antique" || effect === "faded" ? "multiply" : undefined,
        filter: effect === "ink" ? "grayscale(1) contrast(1.25) sepia(.55)" : effect === "antique" ? "sepia(.72) saturate(.72) contrast(1.04)" : effect === "faded" ? "sepia(.8) saturate(.55) contrast(.85)" : undefined
      };
      return <img key={i} src={src} alt={el.getAttribute("alt") || ""} width={validWidth} height={validHeight} loading="lazy" decoding="async" data-manuscript-effect={effect} style={style} />;
    }
    if (tag === "p" || tag === "div") {
      // Only validated layout values are persisted. Editor guides and handles
      // never enter the saved HTML. Relative units keep placement responsive.
      const indent = Number(el.getAttribute("data-ms-indent"));
      const space = Number(el.getAttribute("data-ms-space"));
      const pageBreak = el.getAttribute("data-ms-break") === "1";
      const layout: React.CSSProperties = {};
      if (Number.isInteger(indent) && indent > 0 && indent <= 85) layout.textIndent = indent + "%";
      if (Number.isInteger(space) && space > 0 && space <= 20) layout.paddingBlockStart = space + "lh";
      if (pageBreak) props["data-ms-break"] = "1";
      if (Object.keys(layout).length) props.style = layout;
    }
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
