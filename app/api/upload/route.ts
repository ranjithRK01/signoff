import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";
import { getDownloadURL } from "firebase-admin/storage";
import { getAdminBucket } from "@/lib/firebaseAdmin";

async function saveLocalFallback(buffer: Buffer, safeName: string): Promise<string> {
  const dir = join(process.cwd(), "public", "review-captures");
  await mkdir(dir, { recursive: true });
  const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  const fileName = `${uniqueSuffix}-${safeName}`;
  await writeFile(join(dir, fileName), buffer);
  return `/review-captures/${fileName}`;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const customPath = formData.get("path") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  
  // Use custom path if provided, otherwise default to uploads/timestamp-name
  const destination = customPath 
    ? (customPath.endsWith("/") ? `${customPath}${safeName}` : `${customPath}/${safeName}`)
    : `uploads/${Date.now()}-${safeName}`;

  try {
    const adminBucket = await getAdminBucket();
    const fbFile = adminBucket.file(destination);

    await fbFile.save(buffer, {
      resumable: false,
      metadata: {
        contentType: file.type || "image/png",
        cacheControl: "public, max-age=31536000, immutable",
      },
    });

    let publicUrl: string;
    try {
      await fbFile.makePublic();
      publicUrl = `https://storage.googleapis.com/${adminBucket.name}/${destination}`;
    } catch {
      publicUrl = await getDownloadURL(fbFile);
    }

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.warn("Firebase upload failed, using local fallback:", error);
    try {
      const localUrl = await saveLocalFallback(buffer, safeName);
      return NextResponse.json({ url: localUrl, storage: "local" });
    } catch (localErr) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const localMessage =
        localErr instanceof Error ? localErr.message : "Local save failed";
      return NextResponse.json(
        {
          error: "File upload failed",
          detail: `${message}. Local fallback: ${localMessage}`,
        },
        { status: 500 }
      );
    }
  }
}
