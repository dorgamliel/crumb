// Sharing: the system share sheet where there is one (phones), the clipboard otherwise.

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function shareText(text: string, url?: string, title?: string): Promise<ShareResult> {
  const data: ShareData = { text: url ? `${text}\n${url}` : text, ...(title ? { title } : {}) };
  if (typeof navigator.share === "function") {
    try {
      await navigator.share(data);
      return "shared";
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return "cancelled";
    }
  }
  return (await copy(data.text!)) ? "copied" : "failed";
}

/**
 * The address to share for a topic: a small static page with its own title, description and
 * photo (so the link previews nicely in WhatsApp and elsewhere) that opens the app at the topic.
 */
export function topicShareUrl(id: string): string {
  return new URL(`${import.meta.env.BASE_URL}t/${encodeURIComponent(id)}.html`, location.href).href;
}

export async function shareImage(blob: Blob, filename: string, text: string): Promise<ShareResult> {
  const file = new File([blob], filename, { type: blob.type });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return "shared";
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return "cancelled";
    }
  }
  // Fallback: download the picture.
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return "copied";
}
