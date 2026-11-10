
"use client";

import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

const API =
  "https://mashkeeza-cms-api.smilingshaaaam.workers.dev";

type ContentType = "article" | "page";
type Status = "draft" | "published" | "archived";
type View =
  | "dashboard"
  | "posts"
  | "pages"
  | "editor"
  | "media"
  | "appearance";

interface Content {
  id: string;
  content_type: ContentType;
  title: string;
  slug: string;
  body: string;
  excerpt: string;
  status: Status;
  published_at?: string | null;
  updated_at?: string;
  background_image_url?: string | null;
  background_color?: string;
  background_fit?: string;
  background_position?: string;
  overlay_opacity?: number;
}

interface Media {
  id: string;
  file_name: string;
  url: string;
}

interface Background {
  media_id: string | null;
  background_color: string;
  background_fit: "cover" | "contain" | "repeat";
  background_position:
    | "center"
    | "top"
    | "bottom"
    | "left"
    | "right";
  overlay_opacity: number;
}

const emptyContent = (): Content => ({
  id: "",
  content_type: "article",
  title: "",
  slug: "",
  body: "",
  excerpt: "",
  status: "draft",
});

const emptyBackground = (): Background => ({
  media_id: null,
  background_color: "#071426",
  background_fit: "cover",
  background_position: "center",
  overlay_opacity: 55,
});

const field =
  "w-full rounded-xl border border-amber-500/25 " +
  "bg-[#101c30] px-4 py-3 text-amber-50 " +
  "outline-none focus:border-amber-400";

const button =
  "rounded-xl border border-amber-500/40 " +
  "bg-[#17243a] px-4 py-2.5 text-amber-200 " +
  "transition hover:bg-[#263956] disabled:opacity-50";

const primary =
  "rounded-xl bg-gradient-to-r from-[#a66b20] " +
  "to-[#e0b45e] px-5 py-3 font-bold text-[#111827] " +
  "transition hover:brightness-110 disabled:opacity-50";

function mediaURL(value?: string | null) {
  if (!value) return "";
  if (value.startsWith("/media/")) return API + value;
  if (value.startsWith(API + "/media/")) return value;
  return "";
}

async function request(
  path: string,
  options: RequestInit = {}
) {
  const response = await fetch(API + path, {
    ...options,
    credentials: "include",
    cache: "no-store",
  });

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
        `Server error (${response.status})`
    );
  }

  return data;
}

function jsonRequest(
  method: string,
  data: unknown
): RequestInit {
  return {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  };
}

function dateText(value?: string | null) {
  if (!value) return "—";

  const normalized = value.includes("T")
    ? value
    : value.replace(" ", "T") + "Z";

  const date = new Date(normalized);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB");
}

function SidebarButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "w-full rounded-xl px-4 py-3 text-right " +
        "transition " +
        (active
          ? "bg-amber-500/15 text-amber-300"
          : "text-slate-300 hover:bg-white/5")
      }
    >
      {children}
    </button>
  );
}

export function PublishedContent() {
  const [editingMode, setEditingMode] =
    useState(false);

  const [user, setUser] =
    useState<any>(null);

  const [checking, setChecking] =
    useState(true);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [view, setView] =
    useState<View>("dashboard");

  const [published, setPublished] =
    useState<Content[]>([]);

  const [allContent, setAllContent] =
    useState<Content[]>([]);

  const [media, setMedia] =
    useState<Media[]>([]);

  const [draft, setDraft] =
    useState<Content>(emptyContent());

  const [background, setBackground] =
    useState<Background>(emptyBackground());

  const [message, setMessage] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [settings, setSettings] = useState({
    site_title: "مشکیزہ روحانیت",
    site_subtitle: "علم و معرفت کا روحانی مرکز",
    site_footer:
      "مشکیزہ روحانیت — التماس دعا سید شاہ",
  });

  const loadPublished = useCallback(async () => {
    try {
      const response = await fetch(
        API + "/public/content",
        { cache: "no-store" }
      );

      if (!response.ok) return;

      const data = await response.json();

      setPublished(
        Array.isArray(data.items)
          ? data.items
          : []
      );
    } catch (error) {
      console.error("Public content:", error);
    }
  }, []);

  const loadContent = useCallback(async () => {
    const data = await request("/cms/content");

    setAllContent(
      Array.isArray(data.items)
        ? data.items
        : []
    );
  }, []);

  const loadMedia = useCallback(async () => {
    const data = await request("/cms/media");

    setMedia(
      Array.isArray(data.items)
        ? data.items
        : []
    );
  }, []);

  const loadSettings = useCallback(async () => {
    const data = await request(
      "/admin/site-settings"
    );

    if (data.settings) {
      setSettings(data.settings);
    }
  }, []);

  useEffect(() => {
    void loadPublished();

    const params = new URLSearchParams(
      window.location.search
    );

    const enabled =
      params.get("edit") === "1";

    setEditingMode(enabled);

    if (!enabled) {
      setChecking(false);
      return;
    }

    request("/auth/me")
      .then(async data => {
        if (data.user) {
          setUser(data.user);

          await Promise.allSettled([
            loadContent(),
            loadMedia(),
            loadSettings(),
          ]);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, [
    loadPublished,
    loadContent,
    loadMedia,
    loadSettings,
  ]);

  useEffect(() => {
    if (!editingMode) return;

    const previous =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [editingMode]);

  async function login(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setBusy(true);
    setMessage("");

    try {
      await request(
        "/auth/login",
        jsonRequest("POST", {
          email: email.trim(),
          password,
        })
      );

      const session =
        await request("/auth/me");

      if (!session.user) {
        throw new Error(
          "Login session verify nahi hua."
        );
      }

      setUser(session.user);
      setPassword("");
      setView("dashboard");

      await Promise.allSettled([
        loadContent(),
        loadMedia(),
        loadSettings(),
      ]);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);

    try {
      await request(
        "/auth/logout",
        jsonRequest("POST", {})
      );

      setUser(null);
      setView("dashboard");
      setMessage("");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function navigate(next: View) {
    setView(next);
    setSidebarOpen(false);
    setMessage("");

    if (next === "posts" || next === "pages") {
      void loadContent();
    }

    if (next === "media") {
      void loadMedia();
    }

    if (next === "appearance") {
      void loadSettings();
    }
  }

  function newPost(type: ContentType) {
    setDraft({
      ...emptyContent(),
      content_type: type,
    });

    setBackground(emptyBackground());
    navigate("editor");
  }

  async function editPost(id: string) {
    setBusy(true);
    setMessage("");

    try {
      const [contentData, bgData] =
        await Promise.all([
          request("/cms/content/" + id),
          request(
            "/cms/content/" +
              id +
              "/background"
          ),
        ]);

      const item = contentData.item;

      if (!item) {
        throw new Error(
          "Article load nahi hua."
        );
      }

      setDraft(item);

      const bg =
        bgData.settings || emptyBackground();

      setBackground({
        media_id: bg.media_id || null,
        background_color:
          bg.background_color || "#071426",
        background_fit:
          bg.background_fit || "cover",
        background_position:
          bg.background_position || "center",
        overlay_opacity:
          bg.overlay_opacity ?? 55,
      });

      navigate("editor");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function savePost(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setBusy(true);
    setMessage("");

    try {
      const isExisting = Boolean(draft.id);

      const path = isExisting
        ? "/cms/content/" + draft.id
        : "/cms/content";

      const data = await request(
        path,
        jsonRequest(
          isExisting ? "PUT" : "POST",
          {
            content_type: draft.content_type,
            title: draft.title,
            slug: draft.slug,
            excerpt: draft.excerpt,
            body: draft.body,
            status: draft.status,
          }
        )
      );

      const id = draft.id || data.id;

      if (!id) {
        throw new Error(
          "Server ne article ID nahi di."
        );
      }

      setDraft(previous => ({
        ...previous,
        id,
      }));

      await request(
        "/cms/content/" +
          id +
          "/background",
        jsonRequest("PUT", background)
      );

      await Promise.all([
        loadContent(),
        loadPublished(),
      ]);

      setMessage(
        draft.status === "published"
          ? "Article publish ho gaya."
          : "Draft save ho gaya."
      );
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deletePost(item: Content) {
    if (user?.role !== "super_admin") {
      setMessage(
        "Delete sirf Super Admin kar sakta hai."
      );
      return;
    }

    const confirmed = window.confirm(
      `"${item.title}" ko permanently delete karein?`
    );

    if (!confirmed) return;

    setBusy(true);

    try {
      await request(
        "/cms/content/" + item.id,
        { method: "DELETE" }
      );

      await Promise.all([
        loadContent(),
        loadPublished(),
      ]);

      setMessage("Content delete ho gaya.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(file: File) {
    if (file.size > 8 * 1024 * 1024) {
      setMessage(
        "Image maximum 8 MB honi chahiye."
      );
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const form = new FormData();
      form.append("file", file);

      const data = await request(
        "/cms/media",
        {
          method: "POST",
          body: form,
        }
      );

      await loadMedia();

      if (data.item?.id) {
        setBackground(previous => ({
          ...previous,
          media_id: data.item.id,
        }));
      }

      setMessage(
        "Image upload ho gayi. Article save karein."
      );
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setBusy(true);
    setMessage("");

    try {
      await request(
        "/admin/site-settings",
        jsonRequest("PUT", settings)
      );

      setMessage(
        "Website settings save ho gayi hain."
      );
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const filteredContent = allContent.filter(
    item => {
      const correctType =
        view === "posts"
          ? item.content_type === "article"
          : view === "pages"
            ? item.content_type === "page"
            : true;

      const matchesSearch =
        item.title
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        item.slug
          .toLowerCase()
          .includes(search.toLowerCase());

      return correctType && matchesSearch;
    }
  );

  const totalPosts = allContent.filter(
    item => item.content_type === "article"
  ).length;

  const totalPages = allContent.filter(
    item => item.content_type === "page"
  ).length;

  const totalPublished = allContent.filter(
    item => item.status === "published"
  ).length;

  const totalDrafts = allContent.filter(
    item => item.status === "draft"
  ).length;

  const previewImage = background.media_id
    ? API + "/media/" + background.media_id
    : "";

  const publicWebsite = (
    <section
      className="relative mx-auto w-full max-w-6xl px-4 py-12"
      dir="rtl"
    >
      {published.length > 0 && (
        <>
          <h2 className="gold-text mb-8 text-center text-3xl leading-[2]">
            تازہ ترین تحریریں
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {published.map(item => {
              const image = mediaURL(
                item.background_image_url
              );

              return (
                <article
                  key={item.id}
                  className="gold-frame relative overflow-hidden rounded-xl bg-[#071426]"
                  style={{
                    backgroundColor:
                      item.background_color ||
                      "#071426",
                  }}
                >
                  {image && (
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          `url("${image}")`,
                        backgroundSize:
                          item.background_fit === "repeat"
                            ? "auto"
                            : item.background_fit ||
                              "cover",
                        backgroundPosition:
                          item.background_position ||
                          "center",
                        backgroundRepeat:
                          item.background_fit === "repeat"
                            ? "repeat"
                            : "no-repeat",
                      }}
                    />
                  )}

                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundColor:
                        `rgba(0,0,0,${
                          (item.overlay_opacity ?? 55) /
                          100
                        })`,
                    }}
                  />

                  <div className="relative z-10 p-6">
                    <span className="text-sm text-amber-400">
                      {item.content_type === "article"
                        ? "مضمون"
                        : "صفحہ"}
                    </span>

                    <h3 className="gold-text my-3 text-2xl leading-[2]">
                      {item.title}
                    </h3>

                    {item.excerpt && (
                      <p className="mb-4 leading-[2.2] text-amber-100/80">
                        {item.excerpt}
                      </p>
                    )}

                    <div className="whitespace-pre-wrap break-words leading-[2.3] text-amber-50/90">
                      {item.body}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );

  if (!editingMode) {
    return publicWebsite;
  }

  return (
    <>
      <div
        dir="rtl"
        className="fixed inset-0 z-[2147483647] overflow-y-auto bg-[#08111f] text-slate-100"
        style={{
          fontFamily:
            "Arial, 'Noto Nastaliq Urdu', sans-serif",
        }}
      >
        {checking ? (
          <div className="flex min-h-screen items-center justify-center text-amber-300">
            Admin session check ho raha hai...
          </div>
        ) : !user ? (
          <div className="flex min-h-screen items-center justify-center px-4">
            <div className="w-full max-w-md rounded-3xl border border-amber-500/30 bg-[#101d30] p-8 shadow-2xl">
              <div className="mb-8 text-center">
                <div className="mb-4 text-5xl">
                  ✦
                </div>

                <h1 className="text-3xl font-bold text-amber-300">
                  مشکیزہ روحانیت
                </h1>

                <p className="mt-3 text-sm text-slate-400">
                  Website Management Dashboard
                </p>
              </div>

              <form
                onSubmit={login}
                className="space-y-5"
              >
                <label className="block">
                  <span className="mb-2 block text-sm">
                    Email Address
                  </span>

                  <input
                    type="email"
                    dir="ltr"
                    className={field}
                    value={email}
                    onChange={event =>
                      setEmail(event.target.value)
                    }
                    autoComplete="username"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm">
                    Password
                  </span>

                  <input
                    type="password"
                    dir="ltr"
                    className={field}
                    value={password}
                    onChange={event =>
                      setPassword(event.target.value)
                    }
                    autoComplete="current-password"
                    required
                  />
                </label>

                <button
                  className={primary + " w-full"}
                  disabled={busy}
                >
                  {busy
                    ? "Please wait..."
                    : "Login to Dashboard"}
                </button>
              </form>

              {message && (
                <p
                  role="alert"
                  className="mt-5 text-center text-sm text-red-300"
                >
                  {message}
                </p>
              )}

              <a
                href="/"
                className="mt-7 block text-center text-sm text-amber-300"
              >
                ← View Public Website
              </a>
            </div>
          </div>
        ) : (
          <div className="flex min-h-screen">
            {sidebarOpen && (
              <button
                type="button"
                aria-label="Close menu"
                className="fixed inset-0 z-30 bg-black/70 lg:hidden"
                onClick={() =>
                  setSidebarOpen(false)
                }
              />
            )}

            <aside
              className={
                "fixed inset-y-0 right-0 z-40 w-64 " +
                "overflow-y-auto border-l border-amber-500/15 " +
                "bg-[#0c1729] p-5 transition-transform " +
                "lg:translate-x-0 " +
                (sidebarOpen
                  ? "translate-x-0"
                  : "translate-x-full lg:translate-x-0")
              }
            >
              <div className="mb-8 border-b border-amber-500/20 pb-6 text-center">
                <div className="text-3xl text-amber-400">
                  ✦
                </div>

                <h2 className="mt-2 text-xl font-bold text-amber-300">
                  مشکیزہ روحانیت
                </h2>

                <p className="mt-2 text-xs text-slate-400">
                  Content Management System
                </p>
              </div>

              <nav className="space-y-2">
                <SidebarButton
                  active={view === "dashboard"}
                  onClick={() =>
                    navigate("dashboard")
                  }
                >
                  ◈ Dashboard
                </SidebarButton>

                <SidebarButton
                  active={view === "posts"}
                  onClick={() =>
                    navigate("posts")
                  }
                >
                  ▤ Posts / مضامین
                </SidebarButton>

                <SidebarButton
                  active={view === "pages"}
                  onClick={() =>
                    navigate("pages")
                  }
                >
                  ▣ Pages / صفحات
                </SidebarButton>

                <SidebarButton
                  active={view === "editor"}
                  onClick={() =>
                    newPost("article")
                  }
                >
                  ✎ New Article
                </SidebarButton>

                <SidebarButton
                  active={view === "media"}
                  onClick={() =>
                    navigate("media")
                  }
                >
                  ◧ Media Library
                </SidebarButton>

                <SidebarButton
                  active={view === "appearance"}
                  onClick={() =>
                    navigate("appearance")
                  }
                >
                  ⚙ Website Settings
                </SidebarButton>
              </nav>

              <div className="mt-10 space-y-3 border-t border-amber-500/20 pt-6">
                <a
                  href="/"
                  className="block rounded-xl border border-amber-500/30 px-4 py-3 text-center text-amber-300"
                >
                  View Website ↗
                </a>

                <button
                  type="button"
                  className={button + " w-full"}
                  onClick={() =>
                    void logout()
                  }
                  disabled={busy}
                >
                  Logout
                </button>
              </div>
            </aside>

            <main className="min-w-0 flex-1 lg:mr-64">
              <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between gap-3 border-b border-amber-500/15 bg-[#0c1729]/95 px-4 backdrop-blur md:px-8">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className={button + " lg:hidden"}
                    onClick={() =>
                      setSidebarOpen(true)
                    }
                  >
                    ☰
                  </button>

                  <div>
                    <h1 className="text-lg font-bold text-amber-300 md:text-2xl">
                      {view === "dashboard" &&
                        "Dashboard"}
                      {view === "posts" &&
                        "All Posts"}
                      {view === "pages" &&
                        "All Pages"}
                      {view === "editor" &&
                        (draft.id
                          ? "Edit Content"
                          : "New Content")}
                      {view === "media" &&
                        "Media Library"}
                      {view === "appearance" &&
                        "Website Settings"}
                    </h1>

                    <p className="text-xs text-slate-400">
                      مشکیزہ روحانیت CMS
                    </p>
                  </div>
                </div>

                <div className="text-left text-xs text-slate-300 md:text-sm">
                  <div>
                    {user.displayName ||
                      user.email}
                  </div>

                  <div className="text-amber-500">
                    {user.role}
                  </div>
                </div>
              </header>

              <div className="mx-auto max-w-7xl p-4 pb-20 md:p-8">
                {message && (
                  <div
                    role="status"
                    className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200"
                  >
                    <span>{message}</span>

                    <button
                      type="button"
                      onClick={() =>
                        setMessage("")
                      }
                    >
                      ✕
                    </button>
                  </div>
                )}

                {view === "dashboard" && (
                  <div className="space-y-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold">
                          Welcome to Mashkeeza CMS
                        </h2>

                        <p className="mt-2 text-slate-400">
                          Yahan se apni website manage karein.
                        </p>
                      </div>

                      <button
                        type="button"
                        className={primary}
                        onClick={() =>
                          newPost("article")
                        }
                      >
                        + New Article
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                      {[
                        {
                          label: "Total Posts",
                          value: totalPosts,
                        },
                        {
                          label: "Total Pages",
                          value: totalPages,
                        },
                        {
                          label: "Published",
                          value: totalPublished,
                        },
                        {
                          label: "Drafts",
                          value: totalDrafts,
                        },
                      ].map(stat => (
                        <div
                          key={stat.label}
                          className="rounded-2xl border border-amber-500/20 bg-[#101d30] p-6"
                        >
                          <div className="text-sm text-slate-400">
                            {stat.label}
                          </div>

                          <div className="mt-4 text-4xl font-bold text-amber-300">
                            {stat.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl border border-amber-500/20 bg-[#101d30] p-5">
                      <div className="mb-5 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-amber-300">
                          Recent Content
                        </h3>

                        <button
                          type="button"
                          className={button}
                          onClick={() =>
                            navigate("posts")
                          }
                        >
                          View All
                        </button>
                      </div>

                      {allContent.length === 0 ? (
                        <p className="text-slate-400">
                          Abhi koi content nahi hai.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {allContent
                            .slice(0, 8)
                            .map(item => (
                              <div
                                key={item.id}
                                className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 py-3"
                              >
                                <div>
                                  <div className="text-amber-100">
                                    {item.title}
                                  </div>

                                  <div className="mt-1 text-xs text-slate-400">
                                    {item.status} ·{" "}
                                    {item.content_type}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  className={button}
                                  onClick={() =>
                                    void editPost(item.id)
                                  }
                                >
                                  Edit
                                </button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(view === "posts" ||
                  view === "pages") && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <input
                        className={field + " max-w-md"}
                        placeholder="Search content..."
                        value={search}
                        onChange={event =>
                          setSearch(event.target.value)
                        }
                      />

                      <button
                        type="button"
                        className={primary}
                        onClick={() =>
                          newPost(
                            view === "pages"
                              ? "page"
                              : "article"
                          )
                        }
                      >
                        + Add New
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-amber-500/20 bg-[#101d30]">
                      <table className="w-full min-w-[650px] text-right">
                        <thead className="border-b border-amber-500/20 bg-white/5 text-amber-300">
                          <tr>
                            <th className="p-4">
                              Title
                            </th>
                            <th className="p-4">
                              Status
                            </th>
                            <th className="p-4">
                              Date
                            </th>
                            <th className="p-4">
                              Actions
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {filteredContent.map(item => (
                            <tr
                              key={item.id}
                              className="border-b border-white/10"
                            >
                              <td className="p-4">
                                <div className="font-semibold text-amber-100">
                                  {item.title}
                                </div>

                                <div
                                  dir="ltr"
                                  className="mt-1 text-xs text-slate-500"
                                >
                                  {item.slug}
                                </div>
                              </td>

                              <td className="p-4">
                                <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
                                  {item.status}
                                </span>
                              </td>

                              <td className="p-4 text-sm text-slate-400">
                                {dateText(
                                  item.updated_at ||
                                    item.published_at
                                )}
                              </td>

                              <td className="p-4">
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    className={button}
                                    onClick={() =>
                                      void editPost(
                                        item.id
                                      )
                                    }
                                  >
                                    Edit
                                  </button>

                                  {user.role ===
                                    "super_admin" && (
                                    <button
                                      type="button"
                                      className="rounded-xl border border-red-500/30 px-3 py-2 text-red-300 hover:bg-red-500/10"
                                      onClick={() =>
                                        void deletePost(
                                          item
                                        )
                                      }
                                      disabled={busy}
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {filteredContent.length === 0 && (
                        <p className="p-8 text-center text-slate-400">
                          Koi content nahi mila.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {view === "editor" && (
                  <form
                    onSubmit={savePost}
                    className="space-y-6"
                  >
                    <div className="grid gap-6 xl:grid-cols-[1fr_290px]">
                      <div className="space-y-5">
                        <div className="rounded-2xl border border-amber-500/20 bg-[#101d30] p-5">
                          <label className="mb-5 block">
                            <span className="mb-2 block text-sm text-amber-300">
                              عنوان / Title
                            </span>

                            <input
                              className={field}
                              value={draft.title}
                              maxLength={200}
                              required
                              onChange={event =>
                                setDraft(previous => ({
                                  ...previous,
                                  title:
                                    event.target.value,
                                }))
                              }
                            />
                          </label>

                          <label className="mb-5 block">
                            <span className="mb-2 block text-sm text-amber-300">
                              URL Slug
                            </span>

                            <input
                              dir="ltr"
                              className={field}
                              value={draft.slug}
                              pattern="[a-z0-9]+(-[a-z0-9]+)*"
                              placeholder="my-new-article"
                              required
                              onChange={event =>
                                setDraft(previous => ({
                                  ...previous,
                                  slug:
                                    event.target.value,
                                }))
                              }
                            />
                          </label>

                          <label className="mb-5 block">
                            <span className="mb-2 block text-sm text-amber-300">
                              مختصر تعارف / Excerpt
                            </span>

                            <textarea
                              className={field}
                              rows={3}
                              maxLength={1000}
                              value={draft.excerpt}
                              onChange={event =>
                                setDraft(previous => ({
                                  ...previous,
                                  excerpt:
                                    event.target.value,
                                }))
                              }
                            />
                          </label>

                          <label className="block">
                            <span className="mb-2 block text-sm text-amber-300">
                              مکمل مضمون / Content
                            </span>

                            <textarea
                              className={field}
                              rows={18}
                              value={draft.body}
                              onChange={event =>
                                setDraft(previous => ({
                                  ...previous,
                                  body:
                                    event.target.value,
                                }))
                              }
                            />
                          </label>
                        </div>

                        <div className="rounded-2xl border border-amber-500/20 bg-[#101d30] p-5">
                          <h3 className="mb-5 text-xl font-bold text-amber-300">
                            Article Background
                          </h3>

                          <label className="mb-5 block">
                            <span className="mb-2 block text-sm">
                              Select Background Image
                            </span>

                            <select
                              className={field}
                              value={
                                background.media_id ||
                                ""
                              }
                              onChange={event =>
                                setBackground(
                                  previous => ({
                                    ...previous,
                                    media_id:
                                      event.target
                                        .value ||
                                      null,
                                  })
                                )
                              }
                            >
                              <option value="">
                                No Image
                              </option>

                              {media.map(item => (
                                <option
                                  key={item.id}
                                  value={item.id}
                                >
                                  {item.file_name}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="mb-5 block">
                            <span className="mb-2 block text-sm">
                              Upload New Image
                            </span>

                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif"
                              className={field}
                              disabled={busy}
                              onChange={event => {
                                const file =
                                  event.target
                                    .files?.[0];

                                if (file) {
                                  void uploadImage(
                                    file
                                  );
                                }

                                event.target.value =
                                  "";
                              }}
                            />
                          </label>

                          <div className="grid gap-4 sm:grid-cols-3">
                            <label>
                              <span className="mb-2 block text-sm">
                                Colour
                              </span>

                              <input
                                type="color"
                                className="h-12 w-full"
                                value={
                                  background.background_color
                                }
                                onChange={event =>
                                  setBackground(
                                    previous => ({
                                      ...previous,
                                      background_color:
                                        event.target
                                          .value,
                                    })
                                  )
                                }
                              />
                            </label>

                            <label>
                              <span className="mb-2 block text-sm">
                                Image Fit
                              </span>

                              <select
                                className={field}
                                value={
                                  background.background_fit
                                }
                                onChange={event =>
                                  setBackground(
                                    previous => ({
                                      ...previous,
                                      background_fit:
                                        event.target
                                          .value as Background["background_fit"],
                                    })
                                  )
                                }
                              >
                                <option value="cover">
                                  Cover
                                </option>
                                <option value="contain">
                                  Contain
                                </option>
                                <option value="repeat">
                                  Repeat
                                </option>
                              </select>
                            </label>

                            <label>
                              <span className="mb-2 block text-sm">
                                Position
                              </span>

                              <select
                                className={field}
                                value={
                                  background.background_position
                                }
                                onChange={event =>
                                  setBackground(
                                    previous => ({
                                      ...previous,
                                      background_position:
                                        event.target
                                          .value as Background["background_position"],
                                    })
                                  )
                                }
                              >
                                <option value="center">
                                  Center
                                </option>
                                <option value="top">
                                  Top
                                </option>
                                <option value="bottom">
                                  Bottom
                                </option>
                                <option value="left">
                                  Left
                                </option>
                                <option value="right">
                                  Right
                                </option>
                              </select>
                            </label>
                          </div>

                          <label className="mt-6 block">
                            <span className="mb-2 block text-sm">
                              Overlay Darkness:{" "}
                              {background.overlay_opacity}%
                            </span>

                            <input
                              type="range"
                              min={0}
                              max={100}
                              className="w-full accent-amber-400"
                              value={
                                background.overlay_opacity
                              }
                              onChange={event =>
                                setBackground(
                                  previous => ({
                                    ...previous,
                                    overlay_opacity:
                                      Number(
                                        event.target
                                          .value
                                      ),
                                  })
                                )
                              }
                            />
                          </label>

                          <div
                            className="relative mt-6 min-h-52 overflow-hidden rounded-xl"
                            style={{
                              backgroundColor:
                                background.background_color,
                            }}
                          >
                            {previewImage && (
                              <div
                                className="absolute inset-0"
                                style={{
                                  backgroundImage:
                                    `url("${previewImage}")`,
                                  backgroundSize:
                                    background.background_fit ===
                                    "repeat"
                                      ? "auto"
                                      : background.background_fit,
                                  backgroundPosition:
                                    background.background_position,
                                  backgroundRepeat:
                                    background.background_fit ===
                                    "repeat"
                                      ? "repeat"
                                      : "no-repeat",
                                }}
                              />
                            )}

                            <div
                              className="absolute inset-0"
                              style={{
                                backgroundColor:
                                  `rgba(0,0,0,${
                                    background.overlay_opacity /
                                    100
                                  })`,
                              }}
                            />

                            <div className="relative p-8 text-center text-2xl text-amber-200">
                              {draft.title ||
                                "عنوان کا پیش منظر"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-5">
                        <div className="rounded-2xl border border-amber-500/20 bg-[#101d30] p-5">
                          <h3 className="mb-5 text-lg font-bold text-amber-300">
                            Publish Settings
                          </h3>

                          <label className="mb-5 block">
                            <span className="mb-2 block text-sm">
                              Content Type
                            </span>

                            <select
                              className={field}
                              value={
                                draft.content_type
                              }
                              onChange={event =>
                                setDraft(previous => ({
                                  ...previous,
                                  content_type:
                                    event.target
                                      .value as ContentType,
                                }))
                              }
                            >
                              <option value="article">
                                Article
                              </option>
                              <option value="page">
                                Page
                              </option>
                            </select>
                          </label>

                          <label className="mb-5 block">
                            <span className="mb-2 block text-sm">
                              Status
                            </span>

                            <select
                              className={field}
                              value={draft.status}
                              onChange={event =>
                                setDraft(previous => ({
                                  ...previous,
                                  status:
                                    event.target
                                      .value as Status,
                                }))
                              }
                            >
                              <option value="draft">
                                Draft
                              </option>
                              <option value="published">
                                Published
                              </option>
                              <option value="archived">
                                Archived
                              </option>
                            </select>
                          </label>

                          <button
                            type="submit"
                            className={primary + " w-full"}
                            disabled={busy}
                          >
                            {busy
                              ? "Saving..."
                              : draft.status ===
                                  "published"
                                ? "Save & Publish"
                                : "Save Draft"}
                          </button>

                          <button
                            type="button"
                            className={
                              button + " mt-3 w-full"
                            }
                            onClick={() =>
                              navigate(
                                draft.content_type ===
                                  "page"
                                  ? "pages"
                                  : "posts"
                              )
                            }
                          >
                            Back to List
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                )}

                {view === "media" && (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-amber-500/20 bg-[#101d30] p-5">
                      <h2 className="mb-4 text-xl font-bold text-amber-300">
                        Upload Images
                      </h2>

                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className={field}
                        disabled={busy}
                        onChange={event => {
                          const file =
                            event.target.files?.[0];

                          if (file) {
                            void uploadImage(file);
                          }

                          event.target.value = "";
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                      {media.map(item => (
                        <div
                          key={item.id}
                          className="overflow-hidden rounded-xl border border-amber-500/20 bg-[#101d30]"
                        >
                          <img
                            src={
                              mediaURL(item.url) ||
                              API +
                                "/media/" +
                                item.id
                            }
                            alt={item.file_name}
                            className="h-44 w-full object-cover"
                          />

                          <div className="p-3">
                            <p className="truncate text-sm text-amber-200">
                              {item.file_name}
                            </p>

                            <button
                              type="button"
                              className={button + " mt-3 w-full"}
                              onClick={() => {
                                void navigator.clipboard
                                  .writeText(
                                    API +
                                      "/media/" +
                                      item.id
                                  )
                                  .then(() =>
                                    setMessage(
                                      "Image URL copied."
                                    )
                                  )
                                  .catch(() =>
                                    setMessage(
                                      "URL copy nahi hua."
                                    )
                                  );
                              }}
                            >
                              Copy Image URL
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {view === "appearance" && (
                  <form
                    onSubmit={saveSettings}
                    className="max-w-3xl space-y-6 rounded-2xl border border-amber-500/20 bg-[#101d30] p-6"
                  >
                    <h2 className="text-xl font-bold text-amber-300">
                      Website General Settings
                    </h2>

                    <label className="block">
                      <span className="mb-2 block text-sm">
                        Website Title
                      </span>

                      <input
                        className={field}
                        value={settings.site_title}
                        required
                        maxLength={250}
                        onChange={event =>
                          setSettings(previous => ({
                            ...previous,
                            site_title:
                              event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm">
                        Website Subtitle
                      </span>

                      <input
                        className={field}
                        value={
                          settings.site_subtitle
                        }
                        required
                        maxLength={250}
                        onChange={event =>
                          setSettings(previous => ({
                            ...previous,
                            site_subtitle:
                              event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm">
                        Footer Text
                      </span>

                      <input
                        className={field}
                        value={settings.site_footer}
                        required
                        maxLength={250}
                        onChange={event =>
                          setSettings(previous => ({
                            ...previous,
                            site_footer:
                              event.target.value,
                          }))
                        }
                      />
                    </label>

                    <button
                      className={primary}
                      disabled={busy}
                    >
                      Save Website Settings
                    </button>

                    <p className="text-sm leading-7 text-slate-400">
                      Yeh settings CMS database mein
                      save hoti hain. Public header aur
                      footer mein inhein dikhane ke liye
                      website components ka CMS se
                      connected hona bhi zaroori hai.
                    </p>
                  </form>
                )}
              </div>
            </main>
          </div>
        )}
      </div>
    </>
  );
}

export default PublishedContent;
