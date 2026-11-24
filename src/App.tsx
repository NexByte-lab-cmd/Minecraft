import { useEffect, useRef, useState } from 'react';
import { GameEngine, type HudSnapshot, type StartGameOptions } from './game/GameEngine';
import { MOD_PACKS } from './items/registry';
import { TitleScreen } from './components/TitleScreen';
import { GameHud } from './components/GameHud';
import { InventoryModal } from './components/InventoryModal';
import { TacticalMapModal } from './components/TacticalMapModal';
import { CreatorPanelModal } from './components/CreatorPanelModal';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [snap, setSnap] = useState<HudSnapshot | null>(null);
  const [audioMuted, setAudioMuted] = useState(false);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const engine = new GameEngine(el, (nextSnap) => {
      setSnap(nextSnap);
    });
    engineRef.current = engine;

    // Expose automation/debug hook on window without polluting UI
    (window as unknown as { __voxelEngine?: GameEngine }).__voxelEngine = engine;

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      engine.startNewGame({
        playMode: params.get('online') === '1' ? 'online' : 'offline',
        roomCode: params.get('room') || 'KATHIR-1',
        playerName: params.get('name') || 'KathirHero',
        skinId: params.get('skin') || 'sunny',
        seed: params.get('seed') || 'Kathir',
        mode: 'survival',
        difficulty: 'normal',
        enabledMods: MOD_PACKS.filter((m) => m.enabledByDefault).map((m) => m.id),
      });
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleStart = (opts: StartGameOptions) => {
    engineRef.current?.startNewGame(opts);
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Isolated empty mount div owned exclusively by Three.js */}
      <div ref={mountRef} className="fixed inset-0 w-full h-full" />

      {snap?.gameState === 'title' && <TitleScreen onStart={handleStart} />}

      {snap?.gameState === 'playing' && (
        <GameHud
          snap={snap}
          onSelectHotbar={(idx) => engineRef.current?.setHotbarSlot(idx)}
          onOpenInventory={() => engineRef.current?.toggleInventory()}
          onOpenMap={() => engineRef.current?.toggleMap()}
          onOpenCreator={() => engineRef.current?.toggleCreatorPanel()}
          onCycleCamera={() => engineRef.current?.cycleCamera()}
          onOpenPause={() => engineRef.current?.pauseGame()}
          onToggleMic={() => void engineRef.current?.toggleMic()}
          onSubmitChat={(txt) => engineRef.current?.submitChatOrCommand(txt)}
          onCloseChat={() => engineRef.current?.closeModal()}
        />
      )}

      {snap?.gameState === 'playing' && snap.activeModal === 'inventory' && (
        <InventoryModal
          snap={snap}
          onClose={() => engineRef.current?.closeModal()}
          onCraft={(id) => engineRef.current?.craftById(id)}
          onCraftFromGrid={(gs) => engineRef.current?.craftFromGrid(gs)}
          onPlaceInCraftGrid={(fs, fi, gi) => engineRef.current?.placeOneInCraftGrid(fs, fi, gi)}
          onEquipArmor={(ak, fs, fi) => engineRef.current?.equipArmorSlot(ak, fs, fi)}
          onEnchant={(k) => engineRef.current?.enchantHeldItem(k)}
          onGrantItem={(id, count) => engineRef.current?.grantItem(id, count)}
          onSwapSlots={(sa, ia, sb, ib) => engineRef.current?.swapSlots(sa, ia, sb, ib)}
          onToggleMod={(modId) => engineRef.current?.toggleMod(modId)}
        />
      )}

      {snap?.gameState === 'playing' && snap.activeModal === 'map' && (
        <TacticalMapModal
          snap={snap}
          onClose={() => engineRef.current?.closeModal()}
          onTeleportCoords={(x, z) => engineRef.current?.teleportToCoords(x, z)}
          onSetWaypoint={(x, z, l) => engineRef.current?.setWaypoint(x, z, l)}
          onClearWaypoint={() => engineRef.current?.clearWaypoint()}
          onSwitchRealm={(r) => engineRef.current?.switchRealm(r)}
          onTeleportBiome={(n) => engineRef.current?.teleportToBiome(n)}
        />
      )}

      {snap?.gameState === 'playing' && snap.activeModal === 'creator' && (
        <CreatorPanelModal
          snap={snap}
          onClose={() => engineRef.current?.closeModal()}
          onSetMode={(m) => engineRef.current?.setMode(m)}
          onSetSkin={(s) => engineRef.current?.setSkin(s)}
          onSetTime={(t) => engineRef.current?.setWorldTime(t)}
          onSetWeather={(w) => engineRef.current?.setWorldWeather(w)}
          onBuildBlueprint={(bp) => engineRef.current?.buildBlueprint(bp)}
        />
      )}

      {snap?.gameState === 'paused' && (
        <PauseModal
          snap={snap}
          audioMuted={audioMuted}
          onResume={() => engineRef.current?.resumeGame()}
          onSaveOffline={() => engineRef.current?.saveOfflineWorld()}
          onOpenMap={() => engineRef.current?.toggleMap()}
          onOpenCreator={() => engineRef.current?.toggleCreatorPanel()}
          onSwitchRealm={(r) => engineRef.current?.switchRealm(r)}
          onTeleportBiome={(n) => engineRef.current?.teleportToBiome(n)}
          onToggleMic={() => void engineRef.current?.toggleMic()}
          onUpdateVoice={(p) => engineRef.current?.setVoiceConfig(p)}
          onToggleAudioMute={() => {
            if (!engineRef.current) return;
            engineRef.current.audio.muted = !engineRef.current.audio.muted;
            setAudioMuted(engineRef.current.audio.muted);
          }}
          onReturnToTitle={() => engineRef.current?.returnToTitle()}
        />
      )}

      {snap?.gameState === 'gameover' && (
        <GameOverModal
          mode={snap.mode}
          xpLevel={snap.xpLevel}
          onRespawn={() => engineRef.current?.respawnPlayer()}
          onReturnToTitle={() => engineRef.current?.returnToTitle()}
        />
      )}
    </div>
  );
}
