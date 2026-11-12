"use client";

import React, { useEffect, useRef } from "react";

export const RICH_MARKER = "<!--mashkeeza-rich-v1-->";

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function toEditorHtml(value: string) {
  if (value.startsWith(RICH_MARKER)) return value.slice(RICH_MARKER.length);
  return value.split(/\r?\n/).map(line => `<div>${line ? escapeHtml(line) : "<br>"}</div>`).join("");
}

export function ArticleRichEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const current = useRef<string | null>(null);
  useEffect(() => {
    if (!ref.current || current.current === value) return;
    current.current = value;
    ref.current.innerHTML = toEditorHtml(value);
  }, [value]);

  function update() {
    if (!ref.current) return;
    const next = RICH_MARKER + ref.current.innerHTML;
    current.current = next;
    onChange(next);
  }
  function format(command: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    update();
  }
  function insertLink() {
    const url = window.prompt("Link URL (https://...)");
    if (!url) return;
    try {
      const parsed = new URL(url);
      if (!["https:", "http:"].includes(parsed.protocol)) return;
      format("createLink", parsed.href);
    } catch { window.alert("Durust link dein."); }
  }
  const controls: { label: string; command: string; arg?: string }[] = [
    { label: "B", command: "bold" }, { label: "I", command: "italic" },
    { label: "U", command: "underline" }, { label: "H2", command: "formatBlock", arg: "h2" },
    { label: "H3", command: "formatBlock", arg: "h3" },
    { label: "¶", command: "formatBlock", arg: "p" },
    { label: "• List", command: "insertUnorderedList" },
    { label: "1. List", command: "insertOrderedList" },
    { label: "RTL", command: "justifyRight" },
    { label: "↶", command: "undo" }, { label: "↷", command: "redo" },
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-amber-500/25 bg-[#101c30]">
      <div className="flex flex-wrap gap-1 border-b border-amber-500/20 p-2" dir="ltr">
        {controls.map(item => <button key={item.label} type="button" onMouseDown={event => event.preventDefault()} onClick={() => format(item.command, item.arg)} className="rounded border border-amber-500/30 px-3 py-1 text-sm text-amber-100 hover:bg-amber-500/15" aria-label={item.label}>{item.label}</button>)}
        <button type="button" onMouseDown={event => event.preventDefault()} onClick={insertLink} className="rounded border border-amber-500/30 px-3 py-1 text-sm text-amber-100">🔗 Link</button>
      </div>
      <div ref={ref} dir="rtl" lang="ur" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="مکمل مضمون" onInput={update} onBlur={update} className="min-h-[340px] break-words px-4 py-4 text-right text-lg leading-[2.6] text-amber-50 outline-none [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:text-xl [&_h3]:font-bold [&_a]:text-amber-300 [&_a]:underline [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pr-6 [&_ol]:pr-6" />
    </div>
  );
}
