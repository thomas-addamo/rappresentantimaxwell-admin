"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

export default function AdminPage() {
  const { data: session } = useSession();
  const [text, setText] = useState("");

  useEffect(() => {
    // per ora incolli manualmente o aggiungiamo dopo GET automatico
  }, []);

  if (!session) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Admin</h1>
        <button onClick={() => signIn("github")}>Login GitHub</button>
      </main>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Admin</h1>
      <p>Loggato ✅</p>
      <button onClick={() => signOut()}>Esci</button>

      <h2 style={{ marginTop: 20 }}>newsData.ts (test)</h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ width: "100%", height: 320, fontFamily: "monospace" }}
      />

      <button
        style={{ marginTop: 12 }}
        onClick={async () => {
          const res = await fetch("/api/admin/save-news", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileText: text })
          });
          alert(res.ok ? "Salvato! Deploy in corso sul sito." : "Errore salvataggio");
        }}
      >
        Salva (commit su GitHub)
      </button>
    </main>
  );
}
