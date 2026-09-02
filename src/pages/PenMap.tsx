import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Info, CheckCircle2, LockKeyhole, UnlockKeyhole, Move, ZoomIn, ZoomOut } from 'lucide-react';
import { subscribeToSows, updateSowPen } from '../services/sowService';
import { Sow } from '../types';
import { DndContext, useDraggable, useDroppable, DragEndEvent, pointerWithin, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import { useBottomSheet } from '../contexts/BottomSheetContext';
import clsx from 'clsx';

function DraggableSow({ 
  sow, 
  isHighlighted, 
  isSelected, 
  onSelect,
  isMiniView
}: { 
  sow: Sow, 
  isHighlighted: boolean, 
  isSelected: boolean, 
  onSelect: (sow: Sow) => void,
  isMiniView?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: sow.id!,
    data: { sow },
  });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: transform || isSelected ? 50 : undefined,
    touchAction: 'none', 
    WebkitTouchCallout: 'none',
  };

  let bg = 'bg-[#00bcd4]/20 border-[#00bcd4] text-[#00bcd4]';
  if (sow.type === 'BOAR') bg = 'bg-orange-500/20 border-orange-500 text-orange-400';
  else if (sow.status === 'PREGNANT') bg = 'bg-green-500/20 border-green-500 text-green-400';
  else if (sow.status === 'LACTATING') bg = 'bg-pink-500/20 border-pink-500 text-pink-400';
  else if (sow.status === 'MATED') bg = 'bg-purple-500/20 border-purple-500 text-purple-400';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(sow);
      }}
      className={clsx(
        "cursor-pointer sm:cursor-grab active:cursor-grabbing flex flex-col items-center justify-center select-none transition-all relative overflow-hidden",
        isMiniView ? "w-full h-full text-[10px] sm:text-xs font-bold leading-none rounded border" : "w-full h-full p-1 rounded-lg border-2 shadow-xl font-bold text-sm",
        bg,
        isHighlighted && !isSelected && "ring-4 ring-white animate-pulse",
        isSelected && "ring-4 ring-yellow-400 bg-yellow-400/30 text-slate-900 dark:text-white scale-[1.15] z-50 animate-pulse shadow-yellow-400/50 border-yellow-400",
        isSelected && !isMiniView && "shadow-2xl dark:shadow-xl"
      )}
    >
      <div className={clsx("transition-transform flex items-center justify-center", isSelected && !isMiniView ? "-translate-y-1" : "")}>
        {isMiniView ? sow.sowId.replace(/[^0-9]/g, '').slice(-3) : sow.sowId}
      </div>
      {isSelected && !isMiniView && (
        <div className="absolute bottom-0 w-full bg-yellow-400 flex items-center justify-center py-0.5">
          <UnlockKeyhole className="w-3 h-3 text-black" />
        </div>
      )}
    </div>
  );
}

function PenCell({ 
  penId, 
  sow, 
  highlightedPenId,
  isSelectModeActive,
  onCellClick,
  onSowSelect,
  selectedSowId,
  isMiniView,
  isBoarPen
}: { 
  penId: string, 
  sow?: Sow, 
  highlightedPenId?: string | null,
  isSelectModeActive: boolean,
  onCellClick: (penId: string) => void,
  onSowSelect: (sow: Sow) => void,
  selectedSowId: string | null,
  isMiniView?: boolean,
  isBoarPen?: boolean
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: penId,
  });

  const isHighlighted = highlightedPenId === penId;
  const isSelectedSowHere = sow?.id === selectedSowId;

  return (
    <div
      ref={setNodeRef}
      onClick={() => isSelectModeActive && onCellClick(penId)}
      className={clsx(
        "border relative transition-all flex items-center justify-center",
        isMiniView ? (isBoarPen ? "h-14 rounded-md" : "h-7 rounded-md") : (isBoarPen ? "h-28 rounded-xl" : "h-16 rounded-xl"),
        isSelectModeActive && !isSelectedSowHere ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10" : "",
        isOver || (isSelectModeActive && !sow && !isSelectedSowHere) 
          ? "bg-[#00bcd4]/30 border-[#00bcd4]" 
          : (isBoarPen ? "bg-orange-500/10 border-orange-500/30" : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10"),
        isOver ? "scale-105 z-10" : "",
        isHighlighted && "ring-4 ring-yellow-400 animate-pulse bg-yellow-400/20 z-10"
      )}
      id={`pen-${penId}`}
    >
      {!isMiniView && (
        <>
          <span className="absolute top-1 left-1.5 text-[10px] text-slate-600 dark:text-white/40 font-bold">{penId}</span>
          {isBoarPen && <span className="absolute bottom-1 right-1.5 text-[10px] text-orange-400/70 font-bold">พ่อพันธุ์</span>}
        </>
      )}
      {isMiniView && !sow && (
        <div className="flex flex-col items-center justify-center">
          <span className={clsx("font-bold text-[8px]", isBoarPen ? "text-orange-400/50" : "text-slate-700/20 dark:text-white/20")}>{penId.replace(/^[LR]-/, '')}</span>
          {isBoarPen && <span className="text-[7px] text-orange-400/40">พ่อพันธุ์</span>}
        </div>
      )}
      {isSelectModeActive && !sow && !isMiniView && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
           <Move className="w-5 h-5 text-slate-600 dark:text-white/30" />
        </div>
      )}
      {sow && (
        <div className={clsx("absolute", isMiniView ? "inset-0" : "inset-1")}>
          <DraggableSow 
            sow={sow} 
            isHighlighted={isHighlighted} 
            isSelected={sow.id === selectedSowId}
            onSelect={onSowSelect}
            isMiniView={isMiniView}
          />
        </div>
      )}
    </div>
  );
}

function HoldingArea({ 
  sows, 
  isOverHoldingArea, 
  setHoldingNodeRef, 
  highlightedSowId,
  isSelectModeActive,
  onHoldingClick,
  onSowSelect,
  selectedSowId
}: { 
  sows: Sow[], 
  isOverHoldingArea: boolean, 
  setHoldingNodeRef: any, 
  highlightedSowId?: string | null,
  isSelectModeActive: boolean,
  onHoldingClick: () => void,
  onSowSelect: (sow: Sow) => void,
  selectedSowId: string | null
}) {
  return (
    <div 
      ref={setHoldingNodeRef}
      onClick={() => isSelectModeActive && onHoldingClick()}
      className={clsx(
        "flex-1 bg-slate-100 dark:bg-white/5 border-t border-slate-200 dark:border-white/10 p-4 overflow-y-auto transition-colors relative",
        isOverHoldingArea || isSelectModeActive ? "bg-white dark:bg-white/10" : "",
        isSelectModeActive ? "cursor-pointer" : ""
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-bold text-slate-900 dark:text-white">จุดพักหมู (รอเข้ากรง)</h3>
        <span className="bg-slate-100 dark:bg-white/20 text-slate-900 dark:text-white text-xs font-bold px-2 py-0.5 rounded-full">{sows.length}</span>
        {isSelectModeActive ? (
          <span className="text-yellow-400 text-xs font-bold ml-auto animate-pulse flex items-center gap-1">
            แตะที่นี่เพื่อนำลงจุดพัก <Move className="w-3 h-3" />
          </span>
        ) : (
          isOverHoldingArea && <span className="text-slate-600 dark:text-white/60 text-xs font-bold ml-auto flex items-center gap-1">ลากมาปล่อยที่นี่ <Move className="w-3 h-3" /></span>
        )}
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
        {sows.map(sow => (
          <div key={sow.id} className="h-14">
            <DraggableSow 
              sow={sow} 
              isHighlighted={highlightedSowId === sow.id} 
              isSelected={sow.id === selectedSowId}
              onSelect={onSowSelect}
            />
          </div>
        ))}
        {sows.length === 0 && (
          <div className="col-span-full py-6 flex flex-col items-center justify-center text-slate-600 dark:text-white/30 text-sm">
            <Info className="w-8 h-8 mb-2 opacity-50" />
            <p>ไม่มีหมูที่รอเข้ากรง</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PenMap() {
  const navigate = useNavigate();
  const { showAlert } = useBottomSheet();
  const [sows, setSows] = useState<Sow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedPenId, setHighlightedPenId] = useState<string | null>(null);
  const [selectedSowForMove, setSelectedSowForMove] = useState<Sow | null>(null);
  const [viewMode, setViewMode] = useState<'normal' | 'mini'>('normal');
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeToSows(data => {
      // Filter out culled
      setSows(data.filter(s => s.status !== 'CULLED'));
      setLoading(false);
    });
    return unsub;
  }, []);

  const { leftPens, rightPens, unassignedSows, sowMap } = useMemo(() => {
    const l = Array.from({ length: 52 }, (_, i) => `L-${String(i + 1).padStart(2, '0')}`);
    const r = Array.from({ length: 50 }, (_, i) => `R-${String(i + 1).padStart(2, '0')}`);
    
    let unassigned: Sow[] = [];
    let map: Record<string, Sow> = {};

    sows.forEach(sow => {
      if (sow.penId) {
        map[sow.penId] = sow;
      } else {
        unassigned.push(sow);
      }
    });

    return { leftPens: l, rightPens: r, unassignedSows: unassigned, sowMap: map };
  }, [sows]);

  const { isOver: isOverHoldingArea, setNodeRef: setHoldingNodeRef } = useDroppable({
    id: 'holding-area',
  });

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8, // 8px layout shift to start dragging on desktop/mouse
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 250ms press before drag starts to allow scrolling
        tolerance: 5,
      },
    })
  );

  const handleSowSelect = (sow: Sow) => {
    if (selectedSowForMove?.id === sow.id) {
      setSelectedSowForMove(null); // Deselect if already selected
    } else {
      setSelectedSowForMove(sow); // Select for move
    }
  };

  const handlePenCellClick = async (penId: string) => {
    if (!selectedSowForMove) return;

    if (selectedSowForMove.penId === penId) {
      setSelectedSowForMove(null);
      return;
    }

    const sowId = selectedSowForMove.id!;
    const toPenId = penId;

    if (sowMap[toPenId]) {
      // Pen is occupied, swap
      const existingSow = sowMap[toPenId];
      await updateSowPen(existingSow.id!, selectedSowForMove.penId);
    }
    
    // Optimistic
    setSows(prev => prev.map(s => {
      if (s.id === sowId) return { ...s, penId: toPenId };
      return s;
    }));
    
    await updateSowPen(sowId, toPenId);
    setSelectedSowForMove(null);
  };

  const handleHoldingClick = async () => {
    if (!selectedSowForMove) return;
    if (selectedSowForMove.penId === null) {
      setSelectedSowForMove(null);
      return;
    }

    const sowId = selectedSowForMove.id!;
    
    // Optimistic
    setSows(prev => prev.map(s => {
      if (s.id === sowId) return { ...s, penId: null };
      return s;
    }));
    
    await updateSowPen(sowId, null);
    setSelectedSowForMove(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const sowId = active.id as string;
    const toPenId = over.id as string;

    const sow = sows.find(s => s.id === sowId);
    if (!sow) return;

    let newPenId: string | null = null;

    if (toPenId === 'holding-area') {
      if (sow.penId === null) return; // already in holding
      newPenId = null;
    } else {
      if (sowMap[toPenId]) {
        // Pen is occupied. Swap logic or just reject? Let's simply swap them!
        const existingSow = sowMap[toPenId];
        await updateSowPen(existingSow.id!, sow.penId); // move existing sow to current sow's old pen
      }
      newPenId = toPenId;
    }

    if (newPenId !== sow.penId) {
      // Optimistic update
      setSows(prev => prev.map(s => {
        if (s.id === sowId) return { ...s, penId: newPenId };
        return s;
      }));
      await updateSowPen(sowId, newPenId);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm) {
      setHighlightedPenId(null);
      return;
    }

    const term = searchTerm.toLowerCase();
    const foundSow = sows.find(s => s.sowId.toLowerCase() === term);

    if (foundSow) {
      if (foundSow.penId) {
        setHighlightedPenId(foundSow.penId);
        // Scroll into view
        const el = document.getElementById(`pen-${foundSow.penId}`);
        if (el && scrollContainerRef.current) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        setHighlightedPenId('holding');
      }
    } else {
      setHighlightedPenId(null);
      showAlert('ไม่พบเบอร์แม่หมูที่ค้นหา');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center py-20"><div className="w-10 h-10 border-4 border-[#00bcd4]/30 border-t-[#00bcd4] rounded-full animate-spin"></div></div>;
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
      <div className="h-[calc(100vh-6rem)] md:h-[calc(100vh-2rem)] flex flex-col bg-white dark:bg-[#0a2e36] text-slate-900 dark:text-white">
        
        {/* Header & Search */}
        <div className="p-4 bg-slate-100 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">ตำแหน่ง/ที่อยู่ของแม่พันธุ์</h2>
            <button 
              onClick={() => setViewMode(v => v === 'normal' ? 'mini' : 'normal')}
              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 rounded-lg transition-colors"
            >
              {viewMode === 'normal' ? (
                <>
                  <ZoomOut className="w-4 h-4" />
                  <span className="text-sm font-medium">ย่อมุมมอง</span>
                </>
              ) : (
                <>
                  <ZoomIn className="w-4 h-4" />
                  <span className="text-sm font-medium">มุมมองปกติ</span>
                </>
              )}
            </button>
          </div>
          <form onSubmit={handleSearch} className="relative search-rainbow-border">
            <input 
              type="text" 
              placeholder="ค้นหาเบอร์หูแม่หมู..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!e.target.value) setHighlightedPenId(null);
              }}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/20 rounded-xl focus:outline-none focus:border-[#00bcd4] focus:ring-1 focus:ring-[#00bcd4] text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/50"
            />
            <Search className="w-5 h-5 text-slate-600 dark:text-white/50 absolute left-4 top-1/2 -translate-y-1/2" />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-[#00bcd4] rounded-lg text-sm font-bold active:scale-95 transition-transform">
              ค้นหา
            </button>
          </form>
        </div>

        {/* Scrollable Pen Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 relative scr">
          {selectedSowForMove && (
            <div className="sticky top-0 z-40 mb-4 bg-yellow-400 text-black px-4 py-3 rounded-xl shadow-xl dark:shadow-2xl flex items-center justify-between animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <Move className="w-5 h-5 animate-bounce" />
                <span className="font-bold text-sm">
                  กำลังย้ายแม่หมู "{selectedSowForMove.sowId}"
                </span>
              </div>
              <button 
                onClick={() => setSelectedSowForMove(null)}
                className="px-3 py-1 bg-black/10 hover:bg-black/20 rounded-lg text-xs font-bold active:scale-95 transition-all"
              >
                ยกเลิก
              </button>
            </div>
          )}
          <div className={clsx(
            "max-w-md mx-auto grid gap-4",
            viewMode === 'mini' ? "grid-cols-[1fr_20px_1fr]" : "grid-cols-[1fr_40px_1fr]"
          )}>
            
            {/* Left Pens */}
            <div className={clsx(viewMode === 'mini' ? "space-y-1" : "space-y-3")}>
              {leftPens.map(penId => (
                <PenCell 
                  key={penId} 
                  penId={penId} 
                  sow={sowMap[penId]} 
                  highlightedPenId={highlightedPenId}
                  isSelectModeActive={!!selectedSowForMove}
                  onCellClick={handlePenCellClick}
                  onSowSelect={handleSowSelect}
                  selectedSowId={selectedSowForMove?.id || null}
                  isMiniView={viewMode === 'mini'}
                />
              ))}
            </div>

            {/* Walkway */}
            <div className={clsx(
              "bg-slate-100 dark:bg-white/5 rounded-full flex flex-col items-center",
              viewMode === 'mini' ? "py-1" : "py-4"
            )}>
              <div className="flex-1 border-l-2 border-dashed border-slate-200 dark:border-white/20"></div>
            </div>

            {/* Right Pens */}
            <div className={clsx(viewMode === 'mini' ? "space-y-1" : "space-y-3")}>
              {rightPens.map(penId => (
                <PenCell 
                  key={penId} 
                  penId={penId} 
                  sow={sowMap[penId]} 
                  highlightedPenId={highlightedPenId}
                  isSelectModeActive={!!selectedSowForMove}
                  onCellClick={handlePenCellClick}
                  onSowSelect={handleSowSelect}
                  selectedSowId={selectedSowForMove?.id || null}
                  isMiniView={viewMode === 'mini'}
                  isBoarPen={['R-01', 'R-02', 'R-03'].includes(penId)}
                />
              ))}
            </div>
            
          </div>
        </div>

        {/* Holding Area */}
        {viewMode === 'normal' && (
          <div className="shrink-0 max-h-[30vh] flex flex-col">
            <HoldingArea 
              sows={unassignedSows} 
              isOverHoldingArea={isOverHoldingArea} 
              setHoldingNodeRef={setHoldingNodeRef} 
              highlightedSowId={highlightedPenId === 'holding' ? sows.find(s => s.sowId.toLowerCase() === searchTerm.toLowerCase())?.id : null}
              isSelectModeActive={!!selectedSowForMove}
              onHoldingClick={handleHoldingClick}
              onSowSelect={handleSowSelect}
              selectedSowId={selectedSowForMove?.id || null}
            />
          </div>
        )}

      </div>
    </DndContext>
  );
}
