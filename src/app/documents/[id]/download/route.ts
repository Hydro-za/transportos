import { NextResponse } from "next/server";
import { z } from "zod";
import { getContext } from "@/server/auth/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getContext();
  if (!ctx.organizationId || !ctx.permissions.has("documents.read") || !z.string().uuid().safeParse(id).success) return new NextResponse("Not found", { status: 404 });
  const { data: doc } = await ctx.supabase.from("documents").select("storage_path, title").eq("id", id).maybeSingle();
  if (!doc) return new NextResponse("Not found", { status: 404 });
  const { data } = await ctx.supabase.storage.from("documents").createSignedUrl(doc.storage_path, 60);
  if (!data?.signedUrl) return new NextResponse("Not available", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
