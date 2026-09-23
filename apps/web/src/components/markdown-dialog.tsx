"use client";

import * as React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";

const AUTO_OPEN_DELAY_MS = 4000;

const markdownComponents: Components = {
  h2: ({ children }) => (
    <h2 className="mt-4 font-heading text-base font-semibold first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => <h3 className="mt-3 text-sm font-semibold">{children}</h3>,
  p: ({ children }) => <p className="text-sm text-muted-foreground">{children}</p>,
  ul: ({ children }) => (
    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">{children}</ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
};

interface MarkdownDialogProps {
  title: string;
  content: string;
  trigger: React.ReactElement;
  triggerContent: React.ReactNode;
}

export function MarkdownDialog({ title, content, trigger, triggerContent }: MarkdownDialogProps) {
  const [dismissed, setDismissed] = useLocalStorageState("soroshares:explainer-dismissed", false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (dismissed) return;
    // dismissed is only known after hydration reads localStorage, so scheduling
    // the open here (once, on that first real value) is the side effect itself.
    const id = setTimeout(() => {
      setOpen(true);
    }, AUTO_OPEN_DELAY_MS);
    return () => clearTimeout(id);
  }, [dismissed]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setDismissed(true);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger}>{triggerContent}</DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={markdownComponents}
          >
            {content}
          </ReactMarkdown>
        </div>
      </DialogContent>
    </Dialog>
  );
}
