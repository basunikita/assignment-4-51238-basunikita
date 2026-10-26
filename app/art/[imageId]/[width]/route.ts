import type { NextRequest } from "next/server";
import { fetchMuseumImage } from "@/lib/museum";

export async function GET(_request: NextRequest, ctx: RouteContext<"/art/[imageId]/[width]">) {
  const { imageId, width } = await ctx.params;
  return fetchMuseumImage(imageId, width);
}
