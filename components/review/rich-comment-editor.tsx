"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import "react-quill/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

type RichCommentEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function RichCommentEditor({ value, onChange, placeholder }: RichCommentEditorProps) {
  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link"],
        ["clean"],
      ],
    }),
    []
  );

  const formats = ["header", "bold", "italic", "underline", "strike", "list", "bullet", "link"];

  return (
    <div className="rich-comment-editor rounded-md border border-border bg-white overflow-hidden [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-border [&_.ql-toolbar]:bg-zinc-50 [&_.ql-container]:border-0 [&_.ql-editor]:min-h-[100px] [&_.ql-editor]:text-sm [&_.ql-editor]:text-zinc-900">
      <ReactQuill theme="snow" value={value} onChange={onChange} modules={modules} formats={formats} placeholder={placeholder} />
    </div>
  );
}
