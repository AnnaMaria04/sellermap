"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Quote, Code, Undo2, Redo2 } from "lucide-react";
import { useEffect } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/** Minimal Tiptap-based WYSIWYG editor — enough for product descriptions
 *  (headings, bold/italic, lists, blockquote, inline code, undo). The output
 *  is HTML; consumers store it in product.description as-is. */
export function RichTextEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "tiptap min-h-[160px] w-full rounded-b-lg border border-t-0 border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-green)]",
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      // Tiptap emits "<p></p>" when empty — normalise to "".
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  // Sync external changes (e.g. WB import filling description, or edit-page
  // mount with an initial product). Avoid loops by only setting when different.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || "";
    if (current !== next && (current !== "<p></p>" || next !== "")) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  const btn = (active: boolean, onClick: () => void, label: string, icon: React.ReactNode) => (
    <button
      type="button" title={label} aria-label={label} onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded transition ${
        active ? "bg-[var(--c-bg)] text-[var(--c-text)]" : "text-[var(--c-text2)] hover:text-[var(--c-text)]"
      }`}
    >{icon}</button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2 py-1">
        {btn(editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), "Заголовок 1", <Heading1 size={14} />)}
        {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "Заголовок 2", <Heading2 size={14} />)}
        <span className="mx-1 h-4 w-px bg-[var(--c-border)]" />
        {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "Жирный", <Bold size={14} />)}
        {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "Курсив", <Italic size={14} />)}
        {btn(editor.isActive("code"), () => editor.chain().focus().toggleCode().run(), "Код", <Code size={14} />)}
        <span className="mx-1 h-4 w-px bg-[var(--c-border)]" />
        {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "Список", <List size={14} />)}
        {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "Нумерованный список", <ListOrdered size={14} />)}
        {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), "Цитата", <Quote size={14} />)}
        <span className="mx-1 h-4 w-px bg-[var(--c-border)]" />
        {btn(false, () => editor.chain().focus().undo().run(), "Отменить", <Undo2 size={14} />)}
        {btn(false, () => editor.chain().focus().redo().run(), "Повторить", <Redo2 size={14} />)}
      </div>
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
}
