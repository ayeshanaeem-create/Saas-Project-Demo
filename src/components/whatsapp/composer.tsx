"use client";

import { Camera, Mic, Paperclip, SendHorizontal, Smile } from "lucide-react";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

/** Message box. Enter sends; Shift+Enter adds a new line. */
export function Composer({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  const hasText = text.trim().length > 0;

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!hasText) return;
    onSend(text);
    setText("");
    input.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={submit} className="flex shrink-0 items-end gap-1.5 bg-transparent px-1.5 pt-1 pb-2">
      <div className="flex min-h-11 min-w-0 flex-1 items-end gap-1 rounded-3xl bg-wa-input px-2.5 py-1.5 shadow-[0_1px_0.5px_rgb(11_20_26/0.13)]">
        <Smile aria-hidden className="mb-1.5 size-5 shrink-0 text-wa-icon" />
        <label htmlFor="composer" className="sr-only">
          Message
        </label>
        <textarea
          id="composer"
          ref={input}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Message"
          autoComplete="off"
          className="max-h-28 min-w-0 flex-1 resize-none bg-transparent px-1 py-1.5 text-[15px] leading-5 text-wa-text outline-none [field-sizing:content] placeholder:text-wa-meta"
        />
        <Paperclip aria-hidden className="mb-1.5 size-5 shrink-0 -rotate-45 text-wa-icon" />
        {!hasText && <Camera aria-hidden className="mb-1.5 size-5 shrink-0 text-wa-icon" />}
      </div>

      <button
        type="submit"
        disabled={!hasText}
        aria-label={hasText ? "Send" : "Voice messages aren't part of the demo"}
        title={hasText ? undefined : "Voice messages aren't part of the demo"}
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full bg-wa-primary text-wa-primary-foreground shadow-[0_1px_0.5px_rgb(11_20_26/0.13)] transition-transform",
          hasText ? "cursor-pointer active:scale-95" : "cursor-default",
        )}
      >
        {hasText ? <SendHorizontal className="size-5" aria-hidden /> : <Mic className="size-5" aria-hidden />}
      </button>
    </form>
  );
}
