import { useEffect, useRef, useState } from 'react';
import { CreationWizard } from './components/CreationWizard';
import { DialogueModal } from './components/DialogueModal';
import { GameHUD } from './components/GameHUD';
import { FairyGameEngine } from './game/FairyGameEngine';
import type { DialogueChoice, GameHudState, WorldCreationConfig } from './game/types';
import { DEFAULT_CREATION_CONFIG } from './game/types';

const INITIAL_HUD: GameHudState = {
  zone: 'glade',
  zoneName: '精灵林涧',
  dewdropsCollected: 0,
  totalDewdrops: 7,
  hasWingBlessing: false,
  proximityTarget: null,
  activeDialogue: null,
  isTransitioning: false,
  visitedRooms: ['glade'],
  talkedNpcs: [],
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<FairyGameEngine | null>(null);

  const [hud, setHud] = useState<GameHudState>(INITIAL_HUD);
  const [muted, setMuted] = useState(false);
  const [creationConfig, setCreationConfig] = useState<WorldCreationConfig>(DEFAULT_CREATION_CONFIG);
  const [isCreating, setIsCreating] = useState(true);
  const [creatorSessionId, setCreatorSessionId] = useState(0);
  const [contextLost, setContextLost] = useState(false);
  const [showTouchPad, setShowTouchPad] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  );

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new FairyGameEngine(
      mount,
      (nextHud) => setHud(nextHud),
      (lost) => setContextLost(lost),
    );
    engine.setPreviewMode('character');
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleChangeConfig = (next: WorldCreationConfig) => {
    engineRef.current?.unlockAudio();
    setCreationConfig(next);
    engineRef.current?.applyCreationConfig(next);
  };

  const handleStageChange = (stage: 'character' | 'map') => {
    engineRef.current?.setPreviewMode(stage);
  };

  const handleFinishCreation = () => {
    engineRef.current?.unlockAudio();
    engineRef.current?.setPreviewMode('none');
    setIsCreating(false);
  };

  const handleOpenCreator = () => {
    engineRef.current?.unlockAudio();
    engineRef.current?.closeDialogue();
    setCreatorSessionId((v) => v + 1);
    engineRef.current?.setPreviewMode('character');
    setIsCreating(true);
  };

  const handleToggleMute = () => {
    if (!engineRef.current) return;
    engineRef.current.unlockAudio();
    setMuted(engineRef.current.toggleMute());
  };

  const handleResetCamera = () => {
    engineRef.current?.resetCamera();
  };

  const handleInteract = () => {
    engineRef.current?.triggerInteract();
  };

  const handleJump = () => {
    engineRef.current?.triggerJump();
  };

  const handleVirtualMove = (x: number, y: number) => {
    engineRef.current?.setVirtualInput(x, y);
  };

  const handleAdvanceDialogue = () => {
    engineRef.current?.advanceDialogue();
  };

  const handleSelectChoice = (choice: DialogueChoice) => {
    engineRef.current?.selectDialogueChoice(choice);
  };

  const handleCloseDialogue = () => {
    engineRef.current?.closeDialogue();
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0e1a14]">
      {/* Isolated WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
      />

      {/* Room Doorway Fade Transition Curtain */}
      <div
        className={`pointer-events-none fixed inset-0 z-40 bg-[#0b1410] transition-opacity duration-300 ${
          hud.isTransitioning ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* WebGL Context Lost Fallback */}
      {contextLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0e1a14]/95 p-6 text-center">
          <div className="max-w-md rounded-xl border border-white/15 bg-[#13221a] p-6">
            <h2 className="font-display text-2xl font-bold text-emerald-300">
              正在恢复 3D 场景
            </h2>
            <p className="mt-2 text-sm text-white/75">
              图形上下文暂时中断，请稍候或刷新页面继续探索精灵林涧。
            </p>
          </div>
        </div>
      )}

      {/* Game HUD & Controls */}
      <GameHUD
        hud={hud}
        muted={muted}
        showTouchPad={showTouchPad}
        isCreating={isCreating}
        onToggleMute={handleToggleMute}
        onResetCamera={handleResetCamera}
        onInteract={handleInteract}
        onJump={handleJump}
        onToggleTouchPad={() => setShowTouchPad((v) => !v)}
        onVirtualMove={handleVirtualMove}
        onOpenCreator={handleOpenCreator}
      />

      {/* NPC Dialogue Modal */}
      {hud.activeDialogue && !isCreating && (
        <DialogueModal
          dialogue={hud.activeDialogue}
          onAdvance={handleAdvanceDialogue}
          onSelectChoice={handleSelectChoice}
          onClose={handleCloseDialogue}
        />
      )}

      {/* Guided Dialogue Character + Map Generator */}
      {isCreating && (
        <CreationWizard
          key={creatorSessionId}
          config={creationConfig}
          onChangeConfig={handleChangeConfig}
          onStageChange={handleStageChange}
          onFinish={handleFinishCreation}
        />
      )}
    </div>
  );
}
