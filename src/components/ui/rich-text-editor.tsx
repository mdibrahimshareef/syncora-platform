"use client"

import * as React from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { Bold, Italic, Strikethrough, List, ListOrdered, Quote, Code } from "lucide-react"
import { cn } from "@/lib/utils"
import { Toggle } from "@/components/ui/toggle"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
  onBlur?: () => void
}

export function RichTextEditor({ value, onChange, placeholder = "Type here...", className, minHeight = "min-h-[100px]", onBlur }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none w-full",
          minHeight,
          "px-3 py-2 text-sm"
        ),
      },
    },
    onUpdate: ({ editor }) => {
      // Return HTML or plain text depending on needs. We'll return HTML for rich text.
      // If it's totally empty paragraph, return empty string.
      const html = editor.isEmpty ? "" : editor.getHTML()
      onChange(html)
    },
    onBlur: () => {
      if (onBlur) onBlur()
    }
  })

  // Update content if value prop changes externally
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  if (!editor) {
    return null
  }

  return (
    <div className={cn("flex flex-col border border-input rounded-md bg-background focus-within:ring-1 focus-within:ring-ring", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b border-input p-1 bg-transparent rounded-t-md">
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label="Toggle bold"
          className="h-8 px-2 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
        >
          <Bold className="size-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Toggle italic"
          className="h-8 px-2 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
        >
          <Italic className="size-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('strike')}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          aria-label="Toggle strike"
          className="h-8 px-2 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
        >
          <Strikethrough className="size-4" />
        </Toggle>
        <div className="w-[1px] h-4 bg-border mx-1" />
        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Toggle bullet list"
          className="h-8 px-2 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
        >
          <List className="size-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Toggle ordered list"
          className="h-8 px-2 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
        >
          <ListOrdered className="size-4" />
        </Toggle>
        <div className="w-[1px] h-4 bg-border mx-1" />
        <Toggle
          size="sm"
          pressed={editor.isActive('blockquote')}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
          aria-label="Toggle blockquote"
          className="h-8 px-2 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
        >
          <Quote className="size-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('codeBlock')}
          onPressedChange={() => editor.chain().focus().toggleCodeBlock().run()}
          aria-label="Toggle code block"
          className="h-8 px-2 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
        >
          <Code className="size-4" />
        </Toggle>
      </div>
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  )
}
