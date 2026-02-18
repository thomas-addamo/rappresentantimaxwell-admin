import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import vm from "node:vm";

async function readFileFromGitHub(path: string) {
  const owner = process.env.SITE_OWNER!;
  const repo = process.env.SITE_REPO!;
  const branch = process.env.SITE_BRANCH || "main";
  const token = process.env.GH_TOKEN!;

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    { headers: { Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" } }
  );

  if (!res.ok) throw new Error("Cannot read file from GitHub");
  const json: any = await res.json();
  const text = Buffer.from(json.content, "base64").toString("utf8");
  return { text, sha: json.sha };
}

function extractArrayLiteral(fileText: string, exportName: string) {
  // prende solo la parte: export const X ... = [ ... ];
  const re = new RegExp(
    `export\\s+const\\s+${exportName}[\\s\\S]*?=\\s*(\\[[\\s\\S]*?\\n\\]);`,
    "m"
  );
  const m = fileText.match(re);
  if (!m) throw new Error(`Array ${exportName} not found`);
  return m[1]; // "[ ... ]"
}

function evalArray(arrayLiteral: string) {
  // Valuta solo l'array (JS puro). Non esegue import/TS.
  return vm.runInNewContext(`(${arrayLiteral})`, {}, { timeout: 1000 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const path = process.env.NEWS_PATH!;
  const { text } = await readFileFromGitHub(path);

  const arrLiteral = extractArrayLiteral(text, "newsData");
  const data = evalArray(arrLiteral);

  return Response.json({ items: data });
}
