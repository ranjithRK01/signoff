/** Strip HTML tags for plain-text checks and @-mention parsing. */
export function htmlToPlainText(html: string): string {
  if (!html) return "";
  if (typeof document === "undefined") {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || div.innerText || "").trim();
}

export function isCommentEmpty(html: string): boolean {
  return htmlToPlainText(html).length === 0;
}
