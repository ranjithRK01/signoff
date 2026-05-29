import { NextRequest, NextResponse } from "next/server";
import { getDownloadURL } from "firebase-admin/storage";
import { getAdminBucket } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const adminBucket = await getAdminBucket();

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const destination = `uploads/${uniqueSuffix}-${safeName}`;

    const fbFile = adminBucket.file(destination);

    await fbFile.save(buffer, {
      resumable: false,
      metadata: {
        contentType: file.type || "application/octet-stream",
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
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Upload error:", error);

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || "your-bucket";
    const isBucketMissing =
      message.includes("bucket does not exist") || message.includes("notFound");

    return NextResponse.json(
      {
        error: "File upload failed",
        detail: isBucketMissing
          ? `Storage bucket "${bucketName}" was not found. In Firebase Console → Storage → Get started, then set FIREBASE_STORAGE_BUCKET in .env.local.`
          : message,
      },
      { status: 500 }
    );
  }
}
