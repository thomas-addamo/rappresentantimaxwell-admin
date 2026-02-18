"use client";
// deploy-test

import { useEffect, useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

type EventItem = {
  id: number;
  title: string;
  date: string;      // ISO: YYYY-MM-DDTHH:mm:ss
  endDate?: string;  // ISO opzionale
  displayDate: string;
  location: string;
  description: string;
  image?: string;
};

const emptyEvent = (): Omit<EventItem, "id"> => ({
  title: "",
  date: "",
  endDate: "",
  displayDate: "",
  location: "",
  description: "",
  image: ""
});

export default function EventsAdmin() {
  const { data: session } = useSession();
  const [items, setItems] = useState<EventItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) || null,
    [items, selectedId]
  );

  async function load() {
    const r = await fetch("/api/admin/events");
    if (!r.ok) throw new Error("load failed");
    const j = await r.json();
    setItems(j.items || []);
    setSelectedId(j.items?.[0]?.id ?? null);
  }

  useEffect(() => {
    if (session) void load();
  }, [session]);

  if (!session) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Admin Eventi</h1>
        <button onClick={() => signIn("github")}>Login GitHub</button>
      </main>
    );
  }

  function updateSelected(patch: Partial<EventItem>) {
    if (!selected) return;
    setItems((prev) =>
      prev.map((it) => (it.id === selected.id ? { ...it, ...patch } : it))
    );
  }

  function addEvent() {
    const maxId = items.reduce((m, i) => Math.max(m, i.id), 0);
    const e: EventItem = { id: maxId + 1, ...emptyEvent() };
    setItems([e, ...items]);
    setSelectedId(e.id);
  }

  function removeSelected() {
    if (!selected) return;
    setItems((prev) => prev.filter((i) => i.id !== selected.id));
    setSelectedId(null);
  }

  async function save() {
    const cleaned = items.map((e) => {
      const copy: any = { ...e };
      if (!copy.endDate || String(copy.endDate).trim() === "") delete copy.endDate;
      if (!copy.image || String(copy.image).trim() === "") delete copy.image;
      return copy as EventItem;
    });

    const r = await fetch("/api/admin/events/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cleaned)
    });

    alert(r.ok ? "Salvato! Deploy in corso." : "Errore salvataggio (commit)");
  }

  return (
    <main
      style={{
        padding: 24,
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        gap: 16
      }}
    >
      <aside>
        <h1>Eventi Admin</h1>
        <button onClick={() => signOut()}>Esci</button>

        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button onClick={addEvent}>+ Nuovo</button>
          <button onClick={removeSelected} disabled={!selected}>
            Elimina
          </button>
        </div>

        <ul style={{ marginTop: 12, paddingLeft: 16 }}>
          {items
            .slice()
            .sort((a, b) => b.id - a.id)
            .map((ev) => (
              <li key={ev.id} style={{ marginBottom: 8 }}>
                <button
                  style={{
                    fontWeight: ev.id === selectedId ? "bold" : "normal",
                    textAlign: "left"
                  }}
                  onClick={() => setSelectedId(ev.id)}
                >
                  #{ev.id} {ev.title || "(senza titolo)"}
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
          <p>Seleziona un evento.</p>
        ) : (
          <>
            <h2>Modifica evento #{selected.id}</h2>

            <label>
              Titolo<br />
              <input
                value={selected.title}
                onChange={(e) => updateSelected({ title: e.target.value })}
                style={{ width: "100%" }}
              />
            </label>
            <br />
            <br />

            <label>
              Date (ISO) — es: 2026-01-23T10:00:00<br />
              <input
                value={selected.date}
                onChange={(e) => updateSelected({ date: e.target.value })}
                style={{ width: "100%" }}
              />
            </label>
            <br />
            <br />

            <label>
              End date (ISO) opzionale<br />
              <input
                value={selected.endDate ?? ""}
                onChange={(e) => updateSelected({ endDate: e.target.value })}
                style={{ width: "100%" }}
              />
            </label>
            <br />
            <br />

            <label>
              Display date (testo) — es: 23 Gennaio 2026<br />
              <input
                value={selected.displayDate}
                onChange={(e) => updateSelected({ displayDate: e.target.value })}
                style={{ width: "100%" }}
              />
            </label>
            <br />
            <br />

            <label>
              Location<br />
              <input
                value={selected.location}
                onChange={(e) => updateSelected({ location: e.target.value })}
                style={{ width: "100%" }}
              />
            </label>
            <br />
            <br />

            <label>
              Description<br />
              <textarea
                value={selected.description}
                onChange={(e) => updateSelected({ description: e.target.value })}
                style={{ width: "100%", height: 120 }}
              />
            </label>
            <br />
            <br />

            <label>
              Image URL (opzionale)<br />
              <input
                value={selected.image ?? ""}
                onChange={(e) => updateSelected({ image: e.target.value })}
                style={{ width: "100%" }}
              />
            </label>
          </>
        )}
      </section>
    </main>
  );
}
