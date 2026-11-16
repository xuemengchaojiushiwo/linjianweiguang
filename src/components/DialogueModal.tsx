import { ArrowRight, X } from 'lucide-react';
import type { DialogueChoice, GameHudState } from '../game/types';

interface DialogueModalProps {
  dialogue: NonNullable<GameHudState['activeDialogue']>;
  onAdvance: () => void;
  onSelectChoice: (choice: DialogueChoice) => void;
  onClose: () => void;
}

export function DialogueModal({
  dialogue,
  onAdvance,
  onSelectChoice,
  onClose,
}: DialogueModalProps) {
  const { npcName, npcTitle, accentHex, node } = dialogue;
  const hasChoices = Boolean(node.choices && node.choices.length > 0);

  return (
    <div className="pointer-events-auto fixed bottom-6 left-1/2 z-30 w-[min(680px,94vw)] -translate-x-1/2">
      <div
        className="rounded-xl border border-white/15 bg-[#101c16]/94 p-5 text-[#f4f6ee] shadow-2xl"
        role="dialog"
        aria-label={`${npcTitle} ${npcName} 对话`}
      >
        {/* Header row: clean unboxed typography */}
        <div className="mb-3 flex items-center justify-between gap-4 border-b border-white/10 pb-2.5">
          <div className="flex items-baseline gap-2.5">
            <span
              className="font-display text-xl font-bold tracking-wide"
              style={{ color: accentHex }}
            >
              {npcName}
            </span>
            <span className="text-xs text-white/55">·</span>
            <span className="text-xs font-medium text-white/70">{npcTitle}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="结束对话"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-emerald-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dialogue text */}
        <p className="mb-4 text-[15px] leading-relaxed text-[#eef3e8]">
          {node.text}
        </p>

        {/* Choices or Continue */}
        {hasChoices ? (
          <div className="flex flex-col gap-2">
            {node.choices!.map((choice, idx) => (
              <button
                key={choice.label}
                type="button"
                onClick={() => onSelectChoice(choice)}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/12 bg-white/5 px-4 py-2.5 text-left text-sm font-medium text-[#f4f6ee] transition-colors hover:border-emerald-300/45 hover:bg-emerald-950/60 focus-visible:outline-2 focus-visible:outline-emerald-300"
              >
                <span className="flex items-center gap-2.5">
                  <span className="font-mono-num text-xs text-emerald-300/80">
                    {idx + 1}.
                  </span>
                  <span>{choice.label}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-white/45" />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-white/45">
              按空格或 E 继续 · Esc 离开
            </span>
            <button
              type="button"
              onClick={onAdvance}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-emerald-300 whitespace-nowrap shrink-0"
            >
              <span>继续</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
