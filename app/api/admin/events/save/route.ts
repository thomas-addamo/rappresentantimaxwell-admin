import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

type EventItem = {
  id: number;
  title: string;
  date: string;
  endDate?: string;
  displayDate: string;
  location: string;
  description: string;
  image?: string;
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
  return { text, sha: json.sha };
}

function generateEventsArray(items: EventItem[]) {
  const indent = "  ";
  const inner = "    ";
  const sorted = [...items].sort((a,b) => b.id - a.id);

  const blocks = sorted.map(it => {
    const lines = [
      `${inner}id: ${it.id},`,
      `${inner}title: ${JSON.stringify(it.title)},`,
      `${inner}date: ${JSON.stringify(it.date)},`,
      it.endDate ? `${inner}endDate: ${JSON.stringify(it.endDate)},` : null,
      `${inner}displayDate: ${JSON.stringify(it.displayDate)},`,
      `${inner}location: ${JSON.stringify(it.location)},`,
      `${inner}description: ${JSON.stringify(it.description)},`,
      it.image ? `${inner}image: ${JSON.stringify(it.image)},` : null,
    ].filter(Boolean).join("\n");

    return `${indent}{\n${lines}\n${indent}}`;
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

  const items: EventItem[] = await req.json();

  const path = process.env.EVENTS_PATH!;
  const { text, sha } = await readFromGitHub(path);

  const newArray = generateEventsArray(items);
  const updated = replaceArray(text, "eventsData", newArray);

  await commitToGitHub(path, updated, sha, "Update eventsData.ts from admin");
  return Response.json({ ok: true });
}
