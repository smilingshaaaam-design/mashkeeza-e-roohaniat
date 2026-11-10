"use client";

import { useCallback, useEffect, useState } from "react";

const CMS_API = "https://mashkeeza-cms-api.smilingshaaaam.workers.dev";

type ContentType = "article" | "page";
type Status = "draft" | "published" | "archived";
interface PublishedItem {
  id: string;
  content_type: ContentType;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  published_at: string | null;
  background_image_url?: string | null;
  background_color?: string | null;
  background_fit?: string | null;
  background_position?: string | null;
  overlay_opacity?: number | null;
}
interface EditorItem {
  id?: string;
  content_type: ContentType;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  status: Status;
}
interface MediaItem { id: string; file_name?: string; image_url?: string; url?: string }
interface Background {
  media_id: string | null;
  background_color: string;
  background_fit: "cover" | "contain" | "repeat";
  background_position: "top" | "center" | "bottom";
  overlay_opacity: number;
}
const blank: EditorItem = { content_type: "article", title: "", slug: "", excerpt: "", body: "", status: "draft" };
const defaultBg: Background = { media_id: null, background_color: "#071426", background_fit: "cover", background_position: "center", overlay_opacity: 55 };
const inputClass = "w-full rounded-lg border border-amber-400/40 bg-slate-950 p-3 text-amber-50 outline-none focus:border-amber-300";
const buttonClass = "rounded-lg border border-amber-400/50 bg-slate-900 px-4 py-2 text-amber-200 hover:bg-slate-800 disabled:opacity-50";

function imageUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("/media/")) return CMS_API + value;
  if (value.startsWith(CMS_API + "/media/")) return value;
  return undefined;
}
async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(CMS_API + path, { ...options, credentials: "include", cache: "no-store" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
  return result;
}
function asList(data: any): any[] {
  return Array.isArray(data.items) ? data.items : Array.isArray(data.media) ? data.media : [];
}
function backgroundFrom(data: any): Background {
  const value = data.background || data.item || data || {};
  return {
    media_id: value.media_id || null,
    background_color: /^#[0-9a-fA-F]{6}$/.test(value.background_color || "") ? value.background_color : defaultBg.background_color,
    background_fit: ["cover", "contain", "repeat"].includes(value.background_fit) ? value.background_fit : "cover",
    background_position: ["top", "center", "bottom"].includes(value.background_position) ? value.background_position : "center",
    overlay_opacity: Number.isFinite(Number(value.overlay_opacity)) ? Number(value.overlay_opacity) : 55,
  };
}

export function PublishedContent() {
  const [items, setItems] = useState<PublishedItem[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [draft, setDraft] = useState<EditorItem>({ ...blank });
  const [background, setBackground] = useState<Background>({ ...defaultBg });
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [backgroundPreview, setBackgroundPreview] = useState<string | undefined>();

  const loadPublic = useCallback(async () => {
    try {
      const response = await fetch(CMS_API + "/public/content", { cache: "no-store" });
      if (!response.ok) throw new Error("Public content unavailable");
      const data = await response.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error("CMS public content:", error);
    }
  }, []);

  useEffect(() => { void loadPublic(); }, [loadPublic]);
  // Login is deliberately explicit; no admin controls are shown to ordinary visitors.
  // Open this editor by visiting the website with ?edit=1 in the URL.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("edit") !== "1") return;
    setEditorOpen(true);
    api("/auth/me").then(data => setUser(data.user || null)).catch(() => setUser(null));
  }, []);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      await api("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), password }) });
      const session = await api("/auth/me");
      if (!session.user) throw new Error("Login session could not be verified. Check Worker CORS and cookie settings.");
      setUser(session.user); setPassword("");
      await loadMedia();
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  async function logout() {
    try { await api("/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); }
    catch (error) { setMessage((error as Error).message); return; }
    setUser(null); setDraft({ ...blank }); setMessage("");
  }
  async function loadMedia() {
    try {
      const data = await api("/cms/media");
      setMedia(asList(data));
    } catch (error) { setMessage((error as Error).message); }
  }
  async function editItem(id: string) {
    setBusy(true); setMessage("");
    try {
      const [contentData, backgroundData] = await Promise.all([
        api("/cms/content/" + encodeURIComponent(id)),
        api("/cms/content/" + encodeURIComponent(id) + "/background"),
      ]);
      const value = contentData.item || contentData;
      setDraft({ id: value.id, content_type: value.content_type, title: value.title || "", slug: value.slug || "", excerpt: value.excerpt || "", body: value.body || "", status: value.status || "draft" });
      const bg = backgroundFrom(backgroundData);
      setBackground(bg);
      setBackgroundPreview(imageUrl(backgroundData.image_url || backgroundData.background?.image_url || backgroundData.item?.image_url));
      await loadMedia();
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  function newItem() { setDraft({ ...blank }); setBackground({ ...defaultBg }); setBackgroundPreview(undefined); setMessage(""); }
  async function uploadImage(file: File) {
    setBusy(true); setMessage("");
    try {
      if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) throw new Error("PNG, JPG, WebP ya GIF image (maximum 8MB) select karein.");
      const form = new FormData(); form.append("file", file);
      // Do not set Content-Type: browser supplies the multipart boundary.
      const result = await api("/cms/media", { method: "POST", body: form });
      const value = result.item || result.media || result;
      await loadMedia();
      if (value.id) {
        setBackground(previous => ({ ...previous, media_id: value.id }));
        setBackgroundPreview(imageUrl(value.image_url || value.url) || CMS_API + "/media/" + value.id);
      }
      setMessage("Image uploaded. Background save karna baqi hai.");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  async function saveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const path = draft.id ? "/cms/content/" + encodeURIComponent(draft.id) : "/cms/content";
      const result = await api(path, { method: draft.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const id = draft.id || result.id || result.item?.id;
      if (!id) throw new Error("Content saved, lekin server ne content ID nahi di. Background save nahi hua.");
      setDraft(previous => ({ ...previous, id }));
      await api("/cms/content/" + encodeURIComponent(id) + "/background", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(background) });
      setMessage("Content aur background settings save ho gayi hain.");
      await loadPublic();
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <section className="relative mx-auto w-full max-w-6xl px-4 py-12" dir="rtl">
      {items.length > 0 && <>
        <div className="mb-8 text-center">
          <h2 className="gold-text font-display text-3xl leading-[2] md:text-4xl">تازہ ترین تحریریں</h2>
          <div className="mx-auto mt-2 flex max-w-xs items-center justify-center gap-3">
            <span className="h-px flex-1 bg-gradient-to-l from-gold to-transparent" />
            <span className="size-2 rotate-45 bg-gold shadow-[0_0_10px_#f5c25b]" />
            <span className="h-px flex-1 bg-gradient-to-r from-gold to-transparent" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {items.map(item => {
            const url = imageUrl(item.background_image_url);
            return <article key={item.id} className="gold-frame relative overflow-hidden rounded-xl shadow-[0_0_25px_rgba(245,194,91,0.08)]" style={{ backgroundColor: item.background_color || "#071426" }}>
              {url && <div className="absolute inset-0" aria-hidden="true" style={{ backgroundImage: `url("${url}")`, backgroundSize: item.background_fit === "repeat" ? "auto" : item.background_fit || "cover", backgroundRepeat: item.background_fit === "repeat" ? "repeat" : "no-repeat", backgroundPosition: item.background_position || "center" }} />}
              <div className="absolute inset-0" aria-hidden="true" style={{ backgroundColor: `rgba(0,0,0,${Math.min(100, Math.max(0, item.overlay_opacity ?? 55)) / 100})` }} />
              <div className="relative z-10 p-6">
                <div className="mb-3 flex items-center justify-between gap-3"><span className="gold-text text-sm">{item.content_type === "article" ? "مضمون" : "صفحہ"}</span><span className="text-xs text-gold/60" dir="ltr">{item.published_at ? new Date(item.published_at.replace(" ", "T") + (item.published_at.includes("Z") ? "" : "Z")).toLocaleDateString("ur-PK") : ""}</span></div>
                <h3 className="gold-text mb-4 text-xl leading-[2] md:text-2xl">{item.title}</h3>
                {item.excerpt && <p className="mb-4 text-amber-100/80 leading-[2.2]">{item.excerpt}</p>}
                <div className="whitespace-pre-wrap break-words text-amber-50/90 leading-[2.3]">{item.body}</div>
                {user && <button type="button" className={buttonClass + " mt-4"} onClick={() => void editItem(item.id)}>✎ Edit Article</button>}
              </div>
            </article>;
          })}
        </div>
      </>}

      {editorOpen && <div className="relative z-20 mx-auto mt-8 max-w-4xl rounded-2xl border border-amber-400/50 bg-[#091322] p-4 text-amber-50 shadow-2xl md:p-8">
        <h2 className="mb-5 text-center text-2xl text-amber-300">مشکیزہ روحانیت — Visual Editor</h2>
        {!user ? <form onSubmit={login} className="mx-auto flex max-w-md flex-col gap-3" dir="ltr">
          <label>Email<input className={inputClass} type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="username" /></label>
          <label>Password<input className={inputClass} type="password" value={password} onChange={event => setPassword(event.target.value)} required autoComplete="current-password" /></label>
          <button className={buttonClass} disabled={busy}>Secure Admin Login</button>
        </form> : <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-amber-300">Admin: {user.displayName || user.email}</span><div className="flex gap-2"><button type="button" className={buttonClass} onClick={newItem}>+ New Article</button><button type="button" className={buttonClass} onClick={() => void logout()}>Logout</button></div></div>
          <form onSubmit={saveItem} className="grid gap-4">
            <label>Content Type<select className={inputClass} value={draft.content_type} onChange={event => setDraft(previous => ({ ...previous, content_type: event.target.value as ContentType }))}><option value="article">Article</option><option value="page">Page</option></select></label>
            <label>عنوان<input className={inputClass} value={draft.title} maxLength={200} required onChange={event => setDraft(previous => ({ ...previous, title: event.target.value }))} /></label>
            <label>Slug<input className={inputClass} dir="ltr" value={draft.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" required onChange={event => setDraft(previous => ({ ...previous, slug: event.target.value }))} /></label>
            <label>مختصر تعارف<textarea className={inputClass} rows={3} maxLength={1000} value={draft.excerpt} onChange={event => setDraft(previous => ({ ...previous, excerpt: event.target.value }))} /></label>
            <label>مکمل مضمون<textarea className={inputClass} rows={9} value={draft.body} onChange={event => setDraft(previous => ({ ...previous, body: event.target.value }))} /></label>
            <label>Status<select className={inputClass} value={draft.status} onChange={event => setDraft(previous => ({ ...previous, status: event.target.value as Status }))}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
            <div className="rounded-xl border border-amber-400/30 p-4">
              <h3 className="mb-4 text-xl text-amber-300">Background Settings</h3>
              <label className="block">Upload image (maximum 8MB)<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={inputClass + " mt-2"} disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadImage(file); event.target.value = ""; }} /></label>
              <button type="button" className={buttonClass + " my-3"} onClick={() => void loadMedia()}>Refresh Media Library</button>
              <div className="grid max-h-64 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-4">
                {media.map(asset => <button key={asset.id} type="button" onClick={() => { setBackground(previous => ({ ...previous, media_id: asset.id })); setBackgroundPreview(imageUrl(asset.image_url || asset.url) || CMS_API + "/media/" + asset.id); }} className={`overflow-hidden rounded-lg border p-1 text-xs ${background.media_id === asset.id ? "border-amber-300" : "border-slate-600"}`}><img alt={asset.file_name || "Media image"} src={imageUrl(asset.image_url || asset.url) || CMS_API + "/media/" + asset.id} className="h-20 w-full object-cover" /><span className="block truncate">{asset.file_name || asset.id}</span></button>)}
              </div>
              <button type="button" className={buttonClass + " my-3"} onClick={() => { setBackground(previous => ({ ...previous, media_id: null })); setBackgroundPreview(undefined); }}>Remove Background Image</button>
              <div className="grid gap-4 sm:grid-cols-3">
                <label>Background Colour<input type="color" className="mt-2 h-12 w-full" value={background.background_color} onChange={event => setBackground(previous => ({ ...previous, background_color: event.target.value }))} /></label>
                <label>Image Fit<select className={inputClass} value={background.background_fit} onChange={event => setBackground(previous => ({ ...previous, background_fit: event.target.value as Background["background_fit"] }))}><option value="cover">Cover</option><option value="contain">Contain</option><option value="repeat">Repeat</option></select></label>
                <label>Position<select className={inputClass} value={background.background_position} onChange={event => setBackground(previous => ({ ...previous, background_position: event.target.value as Background["background_position"] }))}><option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option></select></label>
              </div>
              <label className="mt-4 block">Overlay Darkness: {background.overlay_opacity}%<input className="w-full" type="range" min={0} max={100} value={background.overlay_opacity} onChange={event => setBackground(previous => ({ ...previous, overlay_opacity: Number(event.target.value) }))} /></label>
              <div className="relative mt-4 min-h-44 overflow-hidden rounded-xl" style={{ backgroundColor: background.background_color }}>
                {backgroundPreview && <div className="absolute inset-0" style={{ backgroundImage: `url("${backgroundPreview}")`, backgroundSize: background.background_fit === "repeat" ? "auto" : background.background_fit, backgroundRepeat: background.background_fit === "repeat" ? "repeat" : "no-repeat", backgroundPosition: background.background_position }} />}
                <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${background.overlay_opacity / 100})` }} />
                <div className="relative p-8 text-center text-2xl text-amber-200">{draft.title || "عنوان کا پیش منظر"}</div>
              </div>
            </div>
            <button type="submit" className={buttonClass + " py-4 font-bold"} disabled={busy}>{busy ? "Please wait..." : "Save / Publish Content & Background"}</button>
          </form>
        </>}
        {message && <p role="status" className="mt-4 break-words text-center text-amber-200">{message}</p>}
      </div>}
    </section>
  );
}
export default PublishedContent;
