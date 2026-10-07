// Dev-only: next.config.mjs only treats `.dev.js` files as routes during
// `next dev`, so this never ships in the static export.
import { writeFile } from "node:fs/promises";
import path from "node:path";

const FILE = path.join(process.cwd(), "src/data/spotlight.json");

export async function POST(request) {
  const config = await request.json();
  const valid =
    Array.isArray(config) &&
    config.every(
      (c) =>
        typeof c.title === "string" &&
        /^\d{1,3}(\.\d+)?% \d{1,3}(\.\d+)?%$/.test(c.position),
    );
  if (!valid) {
    return Response.json({ error: "Invalid spotlight config" }, { status: 400 });
  }

  await writeFile(FILE, JSON.stringify(config, null, 2) + "\n");
  return Response.json({ ok: true });
}
