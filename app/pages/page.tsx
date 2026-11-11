"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VisualCmsProvider } from "@/components/visual-cms";

const API = "https://mashkeeza-cms-api.smilingshaaaam.workers.dev";
type CmsPage = {
  id: string;
  slug: string;
  title: string;
  body?: string | null;
  excerpt?: string | null;
  content_type: string;
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
      <article className="rounded-2xl border border-amber-700/50 bg-black/55 p-6 shadow-2xl sm:p-12">
        {loading ? <p role="status">صفحہ لوڈ ہو رہا ہے...</p> : error ? (
          <p role="alert" className="text-amber-200">{error}</p>
        ) : page ? (
          <>
            <h1 className="gold-text mb-8 text-2xl font-bold leading-[2] sm:text-4xl">{page.title}</h1>
            {page.excerpt && <p className="mb-6 text-lg leading-[2] text-amber-200">{page.excerpt}</p>}
            <div className="whitespace-pre-wrap break-words text-base leading-[2.5] sm:text-lg">{page.body || ""}</div>
          </>
        ) : null}
      </article>
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
