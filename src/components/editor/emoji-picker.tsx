"use client";

import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const EMOJI = [
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🤍", "💖", "💘", "💌", "💍", "🥂", "🎂", "🎉", "🎁", "🎈",
  "🌹", "🌷", "🌻", "🌸", "🌙", "⭐", "✨", "☀️", "🌈", "🔥", "🕯️", "🍰", "☕", "🍷", "🍕", "🎶",
  "✈️", "🚂", "🏡", "🌊", "🏔️", "🗺️", "📸", "📖", "💭", "🥹", "😭", "😂", "🥰", "😘", "🤭", "😌",
  "🐶", "🐱", "🐻", "🦋", "🐢", "🧸", "🫶", "🤝", "👑", "🎓", "🏆", "🙏", "🫂", "♾️", "💫", "🌟",
];

export function EmojiPicker({ onPick, label }: { onPick: (emoji: string) => void; label: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={label} className="grid size-10 place-items-center rounded-lg text-ink-soft hover:bg-ink/5 md:size-8">
          <Smile className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[20rem] max-w-[calc(100vw-1.5rem)] p-2 md:w-[18rem]">
        <div className="grid grid-cols-8 gap-0.5">
          {EMOJI.map((e) => (
            <button key={e} type="button" onClick={() => onPick(e)} className="grid aspect-square w-full place-items-center rounded-md text-xl hover:bg-ink/5 md:text-lg">
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
