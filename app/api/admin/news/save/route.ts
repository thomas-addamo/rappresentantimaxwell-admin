import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

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

async function readFromGitHub(path: string) {
  const owner = process.env.SITE_OWNER!;
  const repo = process.env.SITE_REPO!;
  const branch = process.env.SITE_BRANCH || "main";
  const token = process.env.GH_TOKEN!;

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    { headers: { Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" } }
  );
  if (!res.ok) throw new Error("Cannot read file");
  const json: any = await res.json();
  const text = Buffer.from(json.content, "base64").toString("utf8");
  return { text, sha: json.sha, branch };
}

function formatContentTemplate(content: string, indent = "    ") {
  // genera:
  // content: `
  //   <p>...</p>
  // `
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const body = lines.map(l => (l.trim() === "" ? "" : `${indent}  ${l}`)).join("\n");
  return `\`\n${body}\n${indent}\``;
}

function generateNewsArray(items: NewsItem[]) {
  const indent = "  ";
  const inner = "    ";
  const sorted = [...items].sort((a,b) => b.id - a.id);

  const blocks = sorted.map(it => {
    return `${indent}{\n` +
      `${inner}id: ${it.id},\n` +
      `${inner}date: ${JSON.stringify(it.date)},\n` +
      `${inner}category: ${JSON.stringify(it.category)},\n` +
      `${inner}title: ${JSON.stringify(it.title)},\n` +
      `${inner}excerpt: ${JSON.stringify(it.excerpt)},\n` +
      `${inner}author: ${JSON.stringify(it.author)},\n` +
      `${inner}featured: ${it.featured ? "true" : "false"},\n` +
      `${inner}content: ${formatContentTemplate(it.content, inner)}\n` +
      `${indent}}`;
  });

  return `[\n${blocks.join(",\n")}\n]`;
}

function replaceArray(fileText: string, exportName: string, newArrayLiteral: string) {
  const re = new RegExp(
    `(export\\s+const\\s+${exportName}[\\s\\S]*?=\\s*)\\[[\\s\\S]*?\\n\\];`,
    "m"
  );
  const m = fileText.match(re);
  if (!m) throw new Error(`Cannot find ${exportName} block`);
  return fileText.replace(re, `$1${newArrayLiteral};`);
}

async function commitToGitHub(path: string, newText: string, sha: string, message: string) {
  const owner = process.env.SITE_OWNER!;
  const repo = process.env.SITE_REPO!;
  const branch = process.env.SITE_BRANCH || "main";
  const token = process.env.GH_TOKEN!;

  const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message,
      content: Buffer.from(newText, "utf8").toString("base64"),
      sha,
      branch
    })
  });

  if (!putRes.ok) throw new Error(await putRes.text());
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const items: NewsItem[] = await req.json();

  const path = process.env.NEWS_PATH!;
  const { text, sha } = await readFromGitHub(path);

  const newArray = generateNewsArray(items);
  const updated = replaceArray(text, "newsData", newArray);

  await commitToGitHub(path, updated, sha, "Update newsData.ts from admin");
  return Response.json({ ok: true });
}
