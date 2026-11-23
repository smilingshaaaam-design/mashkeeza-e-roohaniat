import { ArticleBrowser } from '@/components/article-browser'

export default function ArticlesPage() {
  return <main dir="rtl" className="min-h-screen bg-night p-4 text-amber-100">
    <a href="/">صفحۂ اول</a>
    <ArticleBrowser dedicated />
  </main>
}
