"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { ArticleRichBody } from "@/components/article-rich-body";
import { PremiumParchment } from "@/components/premium-parchment";
import { isPremiumParchment } from "@/components/premium-parchment-settings";
import { RelatedTopics } from "@/components/related-topics";
import { MagicalScroll, isMagicalScrollEnabled } from "@/components/magical-scroll";
import { articleBackgroundStyle, articleOverlayOpacity, type ArticleAppearance } from "@/components/article-background";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VisualCmsProvider } from "@/components/visual-cms";

const API = "https://mashkeeza-cms-api.smilingshaaaam.workers.dev";
type CmsPage = ArticleAppearance & {
  id: string;
  slug: string;
  title: string;
  body?: string | null;
  excerpt?: string | null;
  content_type: string;
  paper_opacity?: number | null;
  use_magical_scroll?: boolean | number | null;
};

function PublishedPageContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "";
  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setPage(null);
    setError("");
    if (!/^[a-z0-9-]{1,150}$/i.test(slug)) {
      setLoading(false);
      setError("Page ka URL durust nahi hai.");
      return () => controller.abort();
    }
    setLoading(true);
    fetch(`${API}/public/content`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Content load nahi ho saka.");
        const data = await response.json();
        const items: CmsPage[] = Array.isArray(data.items) ? data.items : [];
        const found = items.find((item) => item.content_type === "page" && item.slug === slug);
        if (!found) throw new Error("Ye published Page nahi mila.");
        setPage(found);
      })
      .catch((err: Error) => {
        if (!controller.signal.aborted) setError(err.message || "Page load nahi ho saka.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [slug]);

  return (
    <main dir="rtl" className="mx-auto min-h-[60vh] max-w-5xl px-5 py-12 text-amber-100 sm:px-10">
      {page && isPremiumParchment(page.body) ? <PremiumParchment key={page.id} item={page} /> : page && isMagicalScrollEnabled(page.use_magical_scroll) ? (
        <MagicalScroll key={page.id} article={page} />
      ) : (
      <article className="relative isolate overflow-hidden rounded-2xl border border-amber-700/50 p-6 shadow-2xl sm:p-12" style={page ? articleBackgroundStyle(page) : { backgroundColor: '#0000008c' }}>
        {page && <div className="pointer-events-none absolute inset-0 z-0" style={{ backgroundColor: `rgba(0,0,0,${articleOverlayOpacity(page.overlay_opacity)})` }} />}
        <div className="relative z-10">
        {loading ? <p role="status">صفحہ لوڈ ہو رہا ہے...</p> : error ? (
          <p role="alert" className="text-amber-200">{error}</p>
        ) : page ? (
          <>
            <h1 className="gold-text mb-8 text-2xl font-bold leading-[2] sm:text-4xl">{page.title}</h1>
            {page.excerpt && <p className="mb-6 text-lg leading-[2] text-amber-200">{page.excerpt}</p>}
            <div className="whitespace-pre-wrap break-words text-base leading-[2.5] sm:text-lg"><ArticleRichBody body={page.body} /></div>
          </>
        ) : null}
        </div>
      </article>
      )}
      {page && (isPremiumParchment(page.body) || !isMagicalScrollEnabled(page.use_magical_scroll)) && <RelatedTopics key={page.id} slug={page.slug} />}
      <Link className="mt-8 inline-block text-amber-300 underline" href="/">صفحۂ اول</Link>
    </main>
  );
}

export default function PublicPage() {
  return (
    <VisualCmsProvider>
      <div className="min-h-screen bg-night text-amber-100">
        <div className="relative z-[100]"><SiteHeader /></div>
        <Suspense fallback={<main className="min-h-[60vh] p-10 text-center text-amber-200">صفحہ لوڈ ہو رہا ہے...</main>}>
          <PublishedPageContent />
        </Suspense>
        <SiteFooter />
      </div>
    </VisualCmsProvider>
  );
}
