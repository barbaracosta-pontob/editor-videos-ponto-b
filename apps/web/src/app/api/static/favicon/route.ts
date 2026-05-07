import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

export const dynamic = "force-static";

export async function GET() {
  const faviconPath = path.join(process.cwd(), "public", "favicon.ico");
  if (!existsSync(faviconPath)) {
    return new Response("Not found", { status: 404 });
  }
  const file = readFileSync(faviconPath);
  return new Response(file, {
    headers: {
      "Content-Type": "image/x-icon",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
