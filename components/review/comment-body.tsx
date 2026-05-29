"use client";

import { AtSign } from "lucide-react";
/** Renders comment text — HTML from Quill or plain text with @ mentions. */
export function CommentBody({ text }: { text: string }) {
  const isHtml = /<[a-z][\s\S]*>/i.test(text);

  if (isHtml) {
    return (
      <div
        className="text-sm text-zinc-800 prose prose-sm max-w-none [&_a]:text-indigo-600 [&_ul]:list-disc [&_ol]:list-decimal [&_p]:my-1"
        dangerouslySetInnerHTML={{ __html: text }}
      />
    );
  }

  const words = text.split(" ");
  return (
    <span className="text-sm text-zinc-800">
      {words.map((word, idx) => {
        if (word.startsWith("@") && word.includes("@", 1)) {
          const email = word.slice(1);
          const prefix = email.split("@")[0];
          const dispName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
          return (
            <span
              key={idx}
              className="inline-flex items-center gap-0.5 bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded text-[10px] border border-indigo-100 mx-0.5"
            >
              <AtSign className="h-2.5 w-2.5" /> {dispName}
            </span>
          );
        }
        return <span key={idx}>{word} </span>;
      })}
    </span>
  );
}
