import { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Compass,
  DoorOpen,
  Gamepad2,
  MessageCircle,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { GameHudState } from '../game/types';

interface GameHUDProps {
  hud: GameHudState;
  muted: boolean;
  showTouchPad: boolean;
  isCreating: boolean;
  onToggleMute: () => void;
  onResetCamera: () => void;
  onInteract: () => void;
  onJump: () => void;
  onToggleTouchPad: () => void;
  onVirtualMove: (x: number, y: number) => void;
  onOpenCreator: () => void;
}

export function GameHUD({
  hud,
  muted,
  showTouchPad,
  isCreating,
  onToggleMute,
  onResetCamera,
  onInteract,
  onJump,
  onToggleTouchPad,
  onVirtualMove,
  onOpenCreator,
}: GameHUDProps) {
  const [dockCollapsed, setDockCollapsed] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyH' && !hud.activeDialogue) {
        setDockCollapsed((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hud.activeDialogue]);

  return (
    <>
      {/* Top-Left Minimal Nameplate & Exploration Progress (No pills, no pulsing dots) */}
      <div className="pointer-events-none fixed top-5 left-5 z-20 max-w-[90vw]">
        <div className="rounded-xl border border-white/12 bg-[#0d1812]/86 px-4 py-2.5 shadow-lg">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <h1 className="font-display text-lg font-bold tracking-wide text-[#f2f6eb] whitespace-nowrap">
              林涧微光
            </h1>
            <span className="text-xs text-white/35" aria-hidden="true">
              ·
            </span>
            <span className="text-sm font-medium text-emerald-300 whitespace-nowrap">
              {hud.zoneName}
            </span>
            <span className="text-xs text-white/35" aria-hidden="true">
              ·
            </span>
            <span className="font-mono-num text-xs text-amber-200/90 whitespace-nowrap">
              星露 {hud.dewdropsCollected} / {hud.totalDewdrops}
            </span>
            {hud.hasWingBlessing && (
              <>
                <span className="text-xs text-white/35" aria-hidden="true">
                  ·
                </span>
                <span className="text-xs font-medium text-amber-300 whitespace-nowrap">
                  轻灵风露祝福
                </span>
              </>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-white/55">
            <span>已访地点 {hud.visitedRooms.length} / 3</span>
            <span aria-hidden="true">·</span>
            <span>结识伙伴 {hud.talkedNpcs.length} / 4</span>
          </div>
        </div>
      </div>

      {/* Contextual Proximity Prompt above Bottom Dock */}
      {hud.proximityTarget && !hud.activeDialogue && !isCreating && (
        <div className="pointer-events-auto fixed bottom-24 left-1/2 z-20 -translate-x-1/2">
          <button
            type="button"
            onClick={onInteract}
            className="flex items-center gap-3 rounded-xl border border-emerald-300/35 bg-[#0f1f17]/94 px-5 py-2.5 text-left shadow-xl transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-emerald-300 whitespace-nowrap"
          >
            {hud.proximityTarget.type === 'door' ? (
              <DoorOpen className="h-4 w-4 shrink-0 text-amber-300" />
            ) : (
              <MessageCircle className="h-4 w-4 shrink-0 text-emerald-300" />
            )}
            <span className="text-sm font-semibold text-[#f5f8ef]">
              {hud.proximityTarget.label}
            </span>
            <span className="border-l border-white/15 pl-3 font-mono-num text-xs text-emerald-300">
              E
            </span>
          </button>
        </div>
      )}

      {/* Optional On-Screen Touch / Click Pad */}
      {showTouchPad && !hud.activeDialogue && !isCreating && (
        <>
          <div className="pointer-events-auto fixed bottom-24 left-5 z-20 grid grid-cols-3 gap-1.5 rounded-xl border border-white/12 bg-[#0d1812]/88 p-2">
            <div />
            <button
              type="button"
              onPointerDown={() => onVirtualMove(0, -1)}
              onPointerUp={() => onVirtualMove(0, 0)}
              onPointerLeave={() => onVirtualMove(0, 0)}
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 text-sm font-semibold text-white active:bg-emerald-600"
              aria-label="向前"
            >
              ↑
            </button>
            <div />
            <button
              type="button"
              onPointerDown={() => onVirtualMove(-1, 0)}
              onPointerUp={() => onVirtualMove(0, 0)}
              onPointerLeave={() => onVirtualMove(0, 0)}
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 text-sm font-semibold text-white active:bg-emerald-600"
              aria-label="向左"
            >
              ←
            </button>
            <button
              type="button"
              onPointerDown={() => onVirtualMove(0, 1)}
              onPointerUp={() => onVirtualMove(0, 0)}
              onPointerLeave={() => onVirtualMove(0, 0)}
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 text-sm font-semibold text-white active:bg-emerald-600"
              aria-label="向后"
            >
              ↓
            </button>
            <button
              type="button"
              onPointerDown={() => onVirtualMove(1, 0)}
              onPointerUp={() => onVirtualMove(0, 0)}
              onPointerLeave={() => onVirtualMove(0, 0)}
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 text-sm font-semibold text-white active:bg-emerald-600"
              aria-label="向右"
            >
              →
            </button>
          </div>

          <div className="pointer-events-auto fixed right-5 bottom-24 z-20 flex flex-col gap-2">
            <button
              type="button"
              onClick={onJump}
              className="h-12 rounded-xl border border-emerald-300/30 bg-emerald-700/90 px-5 text-sm font-semibold text-white shadow-lg active:bg-emerald-600"
            >
              跳跃 / 二段跳
            </button>
            {hud.proximityTarget && (
              <button
                type="button"
                onClick={onInteract}
                className="h-11 rounded-xl border border-amber-300/35 bg-amber-700/90 px-5 text-sm font-semibold text-white shadow-lg active:bg-amber-600"
              >
                互动 (E)
              </button>
            )}
          </div>
        </>
      )}

      {/* Collapsible Bottom Control Dock (Zero Viewport Occlusion) */}
      {!hud.activeDialogue && !isCreating && (
        <div
          className={`pointer-events-auto fixed bottom-4 left-1/2 z-20 flex w-[min(900px,94vw)] -translate-x-1/2 flex-col items-center transition-transform duration-200 ${
            dockCollapsed ? 'translate-y-[calc(100%-30px)]' : 'translate-y-0'
          }`}
        >
          <button
            type="button"
            onClick={() => setDockCollapsed((v) => !v)}
            className="flex items-center gap-1.5 rounded-t-lg border border-b-0 border-white/12 bg-[#0d1812]/90 px-3 py-1 text-[11px] font-medium text-white/75 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-emerald-300 whitespace-nowrap"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                <span>展开操作栏 [H]</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                <span>收起操作栏 [H]</span>
              </>
            )}
          </button>

          <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-white/12 bg-[#0d1812]/90 px-4 py-2.5 shadow-xl">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/80">
              <span>
                <strong className="font-mono-num text-emerald-300">WASD</strong> 移动
              </span>
              <span className="text-white/25" aria-hidden="true">
                ·
              </span>
              <span>
                <strong className="font-mono-num text-emerald-300">Space</strong> 跳跃 / 二段跳
              </span>
              <span className="text-white/25" aria-hidden="true">
                ·
              </span>
              <span>
                <strong className="font-mono-num text-emerald-300">Shift</strong> 疾行
              </span>
              <span className="text-white/25" aria-hidden="true">
                ·
              </span>
              <span>
                <strong className="font-mono-num text-emerald-300">E</strong> 对话 / 进出房间
              </span>
              <span className="text-white/25" aria-hidden="true">
                ·
              </span>
              <span className="text-white/60">拖拽旋转视角 · 滚轮缩放</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onOpenCreator}
                title="重新捏脸与生成地图"
                className="flex items-center gap-1.5 rounded-lg border border-emerald-400/35 bg-emerald-950/60 px-2.5 py-1.5 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-900/70 whitespace-nowrap shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>造物工坊</span>
              </button>

              <button
                type="button"
                onClick={onToggleTouchPad}
                title="屏幕方向键"
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  showTouchPad
                    ? 'border-emerald-400/50 bg-emerald-900/60 text-emerald-200'
                    : 'border-white/12 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Gamepad2 className="h-3.5 w-3.5" />
                <span>触控键</span>
              </button>

              <button
                type="button"
                onClick={onResetCamera}
                title="重置视角"
                className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white whitespace-nowrap shrink-0"
              >
                <Compass className="h-3.5 w-3.5" />
                <span>回正视角</span>
              </button>

              <button
                type="button"
                onClick={onToggleMute}
                title={muted ? '开启声音' : '静音'}
                aria-label={muted ? '开启声音' : '静音'}
                className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white whitespace-nowrap shrink-0"
              >
                {muted ? <VolumeX className="h-3.5 w-3.5 text-amber-300" /> : <Volume2 className="h-3.5 w-3.5 text-emerald-300" />}
                <span>{muted ? '已静音' : '音效'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
