
"use client";

import { useEffect, useState } from "react";

const CMS_API =
  "https://mashkeeza-cms-api.smilingshaaaam.workers.dev";

interface PublishedItem {
  id: string;
  content_type: "article" | "page";
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  published_at: string;
}

export function PublishedContent() {
  const [items, setItems] = useState<PublishedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadContent() {
      try {
        const response = await fetch(
          `${CMS_API}/public/content`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("Content unavailable");
        }

        const data = await response.json();

        if (active) {
          setItems(
            Array.isArray(data.items) ? data.items : []
          );
          setError(false);
        }
      } catch (err) {
        console.error("CMS content error:", err);

        if (active) {
          setError(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadContent();

    return () => {
      active = false;
    };
  }, []);

  if (loading || error || items.length === 0) {
    return null;
  }

  return (
    <section
      className="relative mx-auto w-full max-w-6xl px-4 py-12"
      dir="rtl"
    >
      <div className="mb-8 text-center">
        <h2 className="gold-text font-display text-3xl leading-[2] md:text-4xl">
          تازہ ترین تحریریں
        </h2>

        <div className="mx-auto mt-2 flex max-w-xs items-center justify-center gap-3">
          <span className="h-px flex-1 bg-gradient-to-l from-gold to-transparent" />
          <span className="size-2 rotate-45 bg-gold shadow-[0_0_10px_#f5c25b]" />
          <span className="h-px flex-1 bg-gradient-to-r from-gold to-transparent" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {items.map((item) => (
          <article
            key={item.id}
            className="gold-frame relative overflow-hidden rounded-xl bg-night/80 p-6 shadow-[0_0_25px_rgba(245,194,91,0.08)]"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="gold-text text-sm">
                {item.content_type === "article"
                  ? "مضمون"
                  : "صفحہ"}
              </span>

              <span className="text-xs text-gold/60" dir="ltr">
                {item.published_at
                  ? new Date(
                      item.published_at.replace(" ", "T") + "Z"
                    ).toLocaleDateString("ur-PK")
                  : ""}
              </span>
            </div>

            <h3 className="gold-text mb-4 text-xl leading-[2] md:text-2xl">
              {item.title}
            </h3>

            {item.excerpt && (
              <p className="mb-4 text-amber-100/80 leading-[2.2]">
                {item.excerpt}
              </p>
            )}

            <div className="whitespace-pre-wrap break-words text-amber-50/90 leading-[2.3]">
              {item.body}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default PublishedContent;
