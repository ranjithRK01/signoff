/** Upload a file to Firebase Storage via Next.js API route. */
export async function uploadScreenshot(blob: Blob, filename: string, path?: string): Promise<string> {
  const form = new FormData();
  form.append("file", blob, filename);
  if (path) {
    form.append("path", path);
  }

  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = (await res.json()) as { url?: string; error?: string; detail?: string };

  if (!res.ok) {
    throw new Error(data.detail ?? data.error ?? "Upload failed");
  }
  if (!data.url) throw new Error("Upload returned no URL");
  return data.url;
}
