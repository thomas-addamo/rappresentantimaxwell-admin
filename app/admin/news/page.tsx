"use client";
import { useEffect, useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

type NewsItem = {
  id: number;
  date: string;
  category: string;
  title: string;
  excerpt: string;
  author: string;
  featured: boolean;
  content: string;
};

const emptyNews = (): Omit<NewsItem, "id"> => ({
  date: "",
  category: "",
  title: "",
  excerpt: "",
  author: "Rappresentanti",
  featured: true,
  content: ""
});

export default function NewsAdmin() {
  const { data: session } = useSession();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selected = useMemo(
    () => items.find(i => i.id === selectedId) || null,
    [items, selectedId]
  );

  async function load() {
    const r = await fetch("/api/admin/news");
    if (!r.ok) throw new Error("load failed");
    const j = await r.json();
    setItems(j.items);
    setSelectedId(j.items?.[0]?.id ?? null);
  }

  useEffect(() => { if (session) load(); }, [session]);

  if (!session) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Admin News</h1>
        <button onClick={() => signIn("github")}>Login GitHub</button>
      </main>
    );
  }

  function updateSelected(patch: Partial<NewsItem>) {
    if (!selected) return;
    setItems(prev => prev.map(it => it.id === selected.id ? { ...it, ...patch } : it));
  }

  function addNews() {
    const maxId = items.reduce((m, i) => Math.max(m, i.id), 0);
    const n: NewsItem = { id: maxId + 1, ...emptyNews() };
    setItems([n, ...items]);
    setSelectedId(n.id);
  }

  function removeSelected() {
    if (!selected) return;
    setItems(prev => prev.filter(i => i.id !== selected.id));
    setSelectedId(null);
  }

  async function save() {
    const r = await fetch("/api/admin/news/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items)
    });
    if (!r.ok) alert("Errore salvataggio (commit)");
    else alert("Salvato! Ora Vercel redeploya il sito.");
  }

  return (
    <main style={{ padding: 24, display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
      <aside>
        <h1>News Admin</h1>
        <button onClick={() => signOut()}>Esci</button>
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button onClick={addNews}>+ Nuova</button>
          <button onClick={removeSelected} disabled={!selected}>Elimina</button>
        </div>

        <ul style={{ marginTop: 12, paddingLeft: 16 }}>
          {items
            .slice()
            .sort((a,b) => b.id - a.id)
            .map(n => (
              <li key={n.id} style={{ marginBottom: 8 }}>
                <button
                  style={{ fontWeight: n.id === selectedId ? "bold" : "normal" }}
                  onClick={() => setSelectedId(n.id)}
                >
                  #{n.id} {n.title || "(senza titolo)"}
                </button>
              </li>
            ))}
        </ul>

        <button style={{ marginTop: 16, width: "100%" }} onClick={save}>
          Salva (commit)
        </button>
      </aside>

      <section>
        {!selected ? (
          <p>Seleziona una news.</p>
        ) : (
          <>
            <h2>Modifica #{selected.id}</h2>

            <label>Data<br/>
              <input value={selected.date} onChange={e => updateSelected({ date: e.target.value })} />
            </label><br/><br/>

            <label>Categoria<br/>
              <input value={selected.category} onChange={e => updateSelected({ category: e.target.value })} />
            </label><br/><br/>

            <label>Titolo<br/>
              <input value={selected.title} onChange={e => updateSelected({ title: e.target.value })} style={{ width: "100%" }} />
            </label><br/><br/>

            <label>Excerpt<br/>
              <textarea value={selected.excerpt} onChange={e => updateSelected({ excerpt: e.target.value })} style={{ width: "100%", height: 80 }} />
            </label><br/><br/>

            <label>Autore<br/>
              <input value={selected.author} onChange={e => updateSelected({ author: e.target.value })} />
            </label><br/><br/>

            <label>
              <input type="checkbox" checked={selected.featured} onChange={e => updateSelected({ featured: e.target.checked })} />
              Featured
            </label><br/><br/>

            <label>Content (HTML)<br/>
              <textarea value={selected.content} onChange={e => updateSelected({ content: e.target.value })} style={{ width: "100%", height: 260, fontFamily: "monospace" }} />
            </label>
          </>
        )}
      </section>
    </main>
  );
}
