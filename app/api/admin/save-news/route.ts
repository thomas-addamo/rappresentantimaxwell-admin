import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

type Body = { fileText: string; message?: string };

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { fileText, message }: Body = await req.json();

  const owner = process.env.SITE_OWNER!;
  const repo = process.env.SITE_REPO!;
  const branch = process.env.SITE_BRANCH || "main";
  const path = process.env.NEWS_PATH!;
  const token = process.env.GH_TOKEN!;

  // 1) GET file per prendere sha
  const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, {
    headers: { Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" }
  });
  if (!getRes.ok) return new Response("Cannot read target file", { status: 500 });
  const getJson: any = await getRes.json();

  // 2) PUT file aggiornato
  const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: message || "Update newsData.ts from admin",
      content: Buffer.from(fileText, "utf8").toString("base64"),
      sha: getJson.sha,
      branch
    })
  });

  if (!putRes.ok) {
    const t = await putRes.text();
    return new Response(`Commit failed: ${t}`, { status: 500 });
  }

  return Response.json({ ok: true });
}
