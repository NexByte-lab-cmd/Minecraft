import React, { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Hammer, Package, Search, Shield, Sparkles, X } from 'lucide-react';
import { BLOCKS, ITEMS, MOD_PACKS, getColor, getName, type ItemCategory } from '../items/registry';
import { ENCHANTMENTS, RECIPES, canCraftRecipe, matchCraftingGrid } from '../items/crafting';
import { getItemIconUrl } from '../engine/textures';
import type { HudSnapshot } from '../game/GameEngine';
import { CharacterPreview } from './CharacterPreview';

interface InventoryModalProps {
  snap: HudSnapshot;
  onClose: () => void;
  onCraft: (recipeId: string) => void;
  onCraftFromGrid: (gridSize: 2 | 3) => void;
  onPlaceInCraftGrid: (fromSec: 'hotbar' | 'backpack', fromIdx: number, gridIdx: number) => void;
  onEquipArmor: (armorKey: 'head' | 'chest' | 'legs' | 'feet', fromSec: 'hotbar' | 'backpack', fromIdx: number) => void;
  onEnchant: (enchantKey: string) => void;
  onGrantItem: (itemId: number, count: number) => void;
  onSwapSlots: (secA: 'hotbar' | 'backpack' | 'craft', idxA: number, secB: 'hotbar' | 'backpack' | 'craft', idxB: number) => void;
  onToggleMod: (modId: string) => void;
}

const CATEGORIES: Array<{ id: 'all' | ItemCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'building', label: 'Building' },
  { id: 'natural', label: 'Nature' },
  { id: 'wood', label: 'Wood' },
  { id: 'tools', label: 'Tools' },
  { id: 'combat', label: 'Combat' },
  { id: 'redstone', label: 'Redstone' },
  { id: 'dyed', label: 'Dyed' },
  { id: 'food', label: 'Food' },
  { id: 'brewing', label: 'Brew' },
  { id: 'mods', label: 'Mods' },
  { id: 'eggs', label: 'Mobs' },
];

export const InventoryModal: React.FC<InventoryModalProps> = ({
  snap,
  onClose,
  onCraft,
  onCraftFromGrid,
  onPlaceInCraftGrid,
  onEquipArmor,
  onEnchant,
  onGrantItem,
  onSwapSlots,
  onToggleMod,
}) => {
  const [rightTab, setRightTab] = useState<'craft' | 'recipes' | 'mods'>('craft');
  const [category, setCategory] = useState<'all' | ItemCategory>('all');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<{ sec: 'hotbar' | 'backpack' | 'craft'; idx: number } | null>(null);

  const combinedSlots = useMemo(() => [...snap.hotbar, ...snap.backpack], [snap.hotbar, snap.backpack]);
  const stationSet = useMemo(() => new Set(snap.nearbyStations), [snap.nearbyStations]);
  const hasCraftingTable = snap.activeStation === 'crafting' || stationSet.has('crafting') || snap.mode === 'creative' || snap.mode === 'architect';
  const gridSize: 2 | 3 = hasCraftingTable ? 3 : 2;
  const isUnlimited = snap.mode === 'creative' || snap.mode === 'architect';

  const catalogEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list: Array<{ id: number; name: string; category: ItemCategory; modId?: string }> = [];
    for (let i = 1; i < BLOCKS.length; i++) {
      const b = BLOCKS[i];
      if (b) list.push({ id: b.id, name: b.name, category: b.category, modId: b.modId });
    }
    for (const key in ITEMS) {
      const it = ITEMS[key];
      list.push({ id: it.id, name: it.name, category: it.category, modId: it.modId });
    }
    return list.filter((e) => {
      if (e.modId && !snap.enabledMods.includes(e.modId)) return false;
      if (category !== 'all' && e.category !== category) return false;
      if (q && !e.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [category, search, snap.enabledMods]);

  const filteredRecipes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return RECIPES.filter((r) => !q || getName(r.output.id).toLowerCase().includes(q));
  }, [search]);

  const gridOutput = useMemo(() => {
    const ids = Array.from({ length: gridSize * gridSize }, (_, i) => snap.craftGrid[i]?.id ?? null);
    return matchCraftingGrid(ids, gridSize);
  }, [gridSize, snap.craftGrid]);

  const handleSlotClick = (sec: 'hotbar' | 'backpack' | 'craft', idx: number) => {
    if (!picked) {
      const arr = sec === 'hotbar' ? snap.hotbar : sec === 'backpack' ? snap.backpack : snap.craftGrid;
      if (arr[idx]) setPicked({ sec, idx });
    } else {
      onSwapSlots(picked.sec, picked.idx, sec, idx);
      setPicked(null);
    }
  };

  const handleSlotRightClick = (e: React.MouseEvent, sec: 'hotbar' | 'backpack', idx: number) => {
    e.preventDefault();
    const arr = sec === 'hotbar' ? snap.hotbar : snap.backpack;
    if (!arr[idx]) return;
    const totalCells = gridSize * gridSize;
    let target = snap.craftGrid.slice(0, totalCells).findIndex((c) => c === null);
    if (target < 0) target = snap.craftGrid.slice(0, totalCells).findIndex((c) => c?.id === arr[idx]?.id);
    if (target >= 0) onPlaceInCraftGrid(sec, idx, target);
  };

  const handleArmorClick = (armorKey: 'head' | 'chest' | 'legs' | 'feet') => {
    if (picked && (picked.sec === 'hotbar' || picked.sec === 'backpack')) {
      onEquipArmor(armorKey, picked.sec, picked.idx);
      setPicked(null);
    }
  };

  const armorKeys: Array<{ key: 'head' | 'chest' | 'legs' | 'feet'; label: string }> = [
    { key: 'head', label: 'Helmet' },
    { key: 'chest', label: 'Chest' },
    { key: 'legs', label: 'Legs' },
    { key: 'feet', label: 'Boots' },
  ];

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-3 md:p-5">
      {/* Classic Two-Pane Console Window */}
      <div className="voxel-panel rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-700 bg-slate-900">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-black text-white">
              Crafting & Inventory ({gridSize}×{gridSize} Grid)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-600 text-amber-300 font-bold">
              {isUnlimited ? 'Unlimited Catalog' : 'Survival Bag'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setRightTab('craft')}
              className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 cursor-pointer ${
                rightTab === 'craft' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              <Hammer className="w-3.5 h-3.5" /> Craft & Gear
            </button>
            <button
              type="button"
              onClick={() => setRightTab('recipes')}
              className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 cursor-pointer ${
                rightTab === 'recipes' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Recipe Book
            </button>
            <button
              type="button"
              onClick={() => setRightTab('mods')}
              className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 cursor-pointer ${
                rightTab === 'mods' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Mods & Enchant
            </button>
            <button
              type="button"
              aria-label="Close Inventory"
              onClick={onClose}
              className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Two-Pane Console Layout matching craft_inventory reference */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-3 p-3.5">
          {/* LEFT PANE: Category Tabs + Search + Dense Item/Block/Egg Catalog */}
          <div className="rounded bg-slate-900/95 border border-slate-700 p-3 flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search 180+ blocks, tools, food & 65+ mob eggs..."
                  className="w-full bg-slate-950 border border-slate-600 rounded pl-8 pr-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                    category === c.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-[380px] overflow-y-auto pr-1">
              {catalogEntries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  title={isUnlimited ? `Take ${entry.name}` : `${entry.name} (Switch to Recipe Book or Creative to spawn)`}
                  onClick={() => {
                    if (isUnlimited) {
                      onGrantItem(entry.id, entry.id < 1000 ? 16 : 1);
                    } else {
                      setSearch(entry.name);
                      setRightTab('recipes');
                    }
                  }}
                  className="voxel-slot rounded p-1.5 flex flex-col items-center gap-1 hover:border-amber-400 cursor-pointer"
                >
                  <img src={getItemIconUrl(entry.id)} alt={entry.name} className="w-7 h-7 pixel-render" />
                  <span className="text-[9.5px] leading-tight text-slate-200 line-clamp-2 w-full text-center min-h-[22px] flex items-center justify-center">
                    {entry.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT PANE: Top Character + Armor + Crafting Matrix | Bottom 27-slot Bag + 9-slot Hotbar */}
          <div className="flex flex-col gap-3">
            {rightTab === 'craft' && (
              <div className="rounded bg-slate-900/95 border border-slate-700 p-3 flex flex-wrap items-center justify-between gap-3">
                {/* 4 Vertical Armor Slots */}
                <div className="flex flex-col gap-1">
                  {armorKeys.map(({ key, label }) => {
                    const slot = snap.armorSlots[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        title={`${label} Armor Slot`}
                        onClick={() => handleArmorClick(key)}
                        className="w-10 h-10 voxel-slot rounded flex flex-col items-center justify-center relative hover:border-amber-400 cursor-pointer"
                      >
                        {slot ? (
                          <img src={getItemIconUrl(slot.id)} alt={getName(slot.id)} className="w-7 h-7 pixel-render" />
                        ) : (
                          <Shield className="w-3.5 h-3.5 text-slate-600" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Live Rotating Character Preview */}
                <CharacterPreview
                  skinId={snap.skinId}
                  width={118}
                  height={162}
                  armorTint={snap.armorSlots.chest ? getColor(snap.armorSlots.chest.id) : undefined}
                  heldItemColor={snap.hotbar[snap.selectedHotbar] ? getColor(snap.hotbar[snap.selectedHotbar]!.id) : undefined}
                />

                {/* Interactive Crafting Grid (2x2 or 3x3) -> Arrow -> Output */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                    Crafting ({gridSize}×{gridSize})
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`grid gap-1 ${
                        gridSize === 3 ? 'grid-cols-3' : 'grid-cols-2'
                      }`}
                    >
                      {Array.from({ length: gridSize * gridSize }).map((_, i) => {
                        const slot = snap.craftGrid[i];
                        const isPicked = picked?.sec === 'craft' && picked.idx === i;
                        return (
                          <button
                            key={i}
                            type="button"
                            aria-label={`Craft grid slot ${i + 1}`}
                            onClick={() => handleSlotClick('craft', i)}
                            className={`w-10 h-10 rounded relative flex items-center justify-center cursor-pointer ${
                              isPicked ? 'voxel-slot-active' : 'voxel-slot hover:border-slate-400'
                            }`}
                          >
                            {slot && (
                              <>
                                <img src={getItemIconUrl(slot.id)} alt={getName(slot.id)} className="w-7 h-7 pixel-render" />
                                {slot.count > 1 && (
                                  <span className="absolute bottom-0 right-0.5 text-[10px] font-bold text-white">
                                    {slot.count}
                                  </span>
                                )}
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <ArrowRight className="w-5 h-5 text-slate-400 shrink-0" />

                    <button
                      type="button"
                      aria-label={gridOutput ? `Craft ${getName(gridOutput.id)}` : 'Crafting Output'}
                      disabled={!gridOutput}
                      onClick={() => onCraftFromGrid(gridSize)}
                      className={`w-12 h-12 rounded relative flex items-center justify-center ${
                        gridOutput
                          ? 'voxel-slot-active cursor-pointer hover:brightness-110'
                          : 'voxel-slot opacity-60 cursor-default'
                      }`}
                    >
                      {gridOutput && (
                        <>
                          <img src={getItemIconUrl(gridOutput.id)} alt={getName(gridOutput.id)} className="w-8 h-8 pixel-render" />
                          {gridOutput.count > 1 && (
                            <span className="absolute bottom-0 right-1 text-[11px] font-black text-white">
                              {gridOutput.count}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-400 text-center">
                    Right-click bag item to place 1 in grid
                  </div>
                </div>
              </div>
            )}

            {rightTab === 'recipes' && (
              <div className="rounded bg-slate-900/95 border border-slate-700 p-3 flex flex-col gap-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  1-Click Recipe Book ({filteredRecipes.length}) · Stations: {snap.nearbyStations.join(', ')}
                </div>
                <div className="flex flex-col gap-1 max-h-44 overflow-y-auto pr-1">
                  {filteredRecipes.map((r) => {
                    const craftable = canCraftRecipe(r, combinedSlots, stationSet);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onCraft(r.id)}
                        className={`flex items-center justify-between p-1.5 rounded border text-left cursor-pointer ${
                          craftable
                            ? 'bg-emerald-950/60 border-emerald-500/60 hover:bg-emerald-900/70'
                            : 'bg-slate-800/70 border-slate-700 opacity-65'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img src={getItemIconUrl(r.output.id)} alt="" className="w-6 h-6 pixel-render shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">
                              {getName(r.output.id)} ×{r.output.count}
                            </div>
                            <div className="text-[10px] text-slate-300 truncate">
                              [{r.station}] {r.inputs.map((i) => `${i.count}× ${getName(i.id)}`).join(', ')}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                            craftable ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          Craft
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {rightTab === 'mods' && (
              <div className="rounded bg-slate-900/95 border border-slate-700 p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-52 overflow-y-auto">
                <div className="flex flex-col gap-1.5">
                  <div className="text-[11px] font-bold uppercase text-slate-300">Active Game Mods</div>
                  {MOD_PACKS.map((m) => {
                    const on = snap.enabledMods.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onToggleMod(m.id)}
                        className={`p-1.5 rounded border text-left flex items-center justify-between cursor-pointer ${
                          on ? 'bg-emerald-950/50 border-emerald-500/60' : 'bg-slate-800 border-slate-700'
                        }`}
                      >
                        <span className="text-[11px] font-bold text-white truncate">{m.name}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-950 text-amber-300">
                          {on ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="text-[11px] font-bold uppercase text-slate-300">
                    Enchant Held Item (Lv.{snap.xpLevel})
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {ENCHANTMENTS.slice(0, 8).map((enc) => (
                      <button
                        key={enc.key}
                        type="button"
                        onClick={() => onEnchant(enc.key)}
                        className="p-1.5 rounded bg-fuchsia-950/50 border border-fuchsia-500/50 hover:bg-fuchsia-900/60 text-left cursor-pointer"
                      >
                        <div className="text-[10px] font-bold text-fuchsia-200 truncate">{enc.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Backpack (27 slots) + Hotbar (9 slots) */}
            <div className="rounded bg-slate-900/95 border border-slate-700 p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-300">
                <span>Backpack & Hotbar</span>
                <span className="text-[10px] text-amber-300">
                  {picked ? 'Click target slot to place/swap' : 'Click to move · Right-click to craft'}
                </span>
              </div>

              <div className="grid grid-cols-9 gap-1">
                {snap.backpack.map((slot, idx) => {
                  const isPicked = picked?.sec === 'backpack' && picked.idx === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSlotClick('backpack', idx)}
                      onContextMenu={(e) => handleSlotRightClick(e, 'backpack', idx)}
                      title={slot ? getName(slot.id) : 'Empty'}
                      className={`h-10 rounded relative flex items-center justify-center cursor-pointer ${
                        isPicked ? 'voxel-slot-active' : 'voxel-slot hover:border-slate-400'
                      }`}
                    >
                      {slot && (
                        <>
                          <img src={getItemIconUrl(slot.id)} alt={getName(slot.id)} className="w-7 h-7 pixel-render" />
                          {slot.count > 1 && (
                            <span className="absolute bottom-0 right-0.5 text-[10px] font-bold text-white">
                              {slot.count}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-9 gap-1 pt-1 border-t border-slate-700">
                {snap.hotbar.map((slot, idx) => {
                  const isPicked = picked?.sec === 'hotbar' && picked.idx === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSlotClick('hotbar', idx)}
                      onContextMenu={(e) => handleSlotRightClick(e, 'hotbar', idx)}
                      title={slot ? getName(slot.id) : `Hotbar ${idx + 1}`}
                      className={`h-10 rounded relative flex items-center justify-center cursor-pointer ${
                        isPicked ? 'voxel-slot-active' : 'voxel-slot hover:border-slate-400'
                      }`}
                    >
                      {slot && (
                        <>
                          <img src={getItemIconUrl(slot.id)} alt={getName(slot.id)} className="w-7 h-7 pixel-render" />
                          {slot.count > 1 && (
                            <span className="absolute bottom-0 right-0.5 text-[10px] font-bold text-white">
                              {slot.count}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
