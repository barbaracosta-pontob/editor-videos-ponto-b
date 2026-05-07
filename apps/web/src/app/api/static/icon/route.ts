import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

export const dynamic = "force-static";

export async function GET() {
  const iconPath = path.join(process.cwd(), "public", "icon.png");
  if (!existsSync(iconPath)) {
    return new Response("Not found", { status: 404 });
  }
  const file = readFileSync(iconPath);
  return new Response(file, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
