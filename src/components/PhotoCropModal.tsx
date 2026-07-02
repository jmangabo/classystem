import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { X, Minus, Plus, Check, Loader2 } from "lucide-react";

interface PhotoCropModalProps {
  imageSrc: string;
  onCrop: (croppedBase64: string) => void;
  onCancel: () => void;
}

export function PhotoCropModal({
  imageSrc,
  onCrop,
  onCancel
}: PhotoCropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  const containerWidth = 240;
  const containerHeight = 308; // 35 / 45 passport size aspect ratio (approx 0.777) scaled

  // Base dimensions calculation to cover the passport container (object-cover equivalent)
  const baseSize = useMemo(() => {
    if (!naturalSize) return { width: containerWidth, height: containerHeight };
    const { width: iw, height: ih } = naturalSize;
    const targetRatio = containerWidth / containerHeight;
    const imageRatio = iw / ih;

    if (imageRatio > targetRatio) {
      // Image is wider than container -> height matches container, width scales up
      const h = containerHeight;
      const w = containerHeight * imageRatio;
      return { width: w, height: h };
    } else {
      // Image is taller than container -> width matches container, height scales up
      const w = containerWidth;
      const h = containerWidth / imageRatio;
      return { width: w, height: h };
    }
  }, [naturalSize]);

  // Dimensions of the image scaled by current zoom level
  const renderSize = useMemo(() => {
    return {
      width: baseSize.width * zoom,
      height: baseSize.height * zoom
    };
  }, [baseSize, zoom]);

  // Restrict offset to keep image edges within the boundary of the passport container
  const constrainOffsets = useCallback((x: number, y: number, rWidth: number, rHeight: number) => {
    const maxOffsetX = (rWidth - containerWidth) / 2;
    const maxOffsetY = (rHeight - containerHeight) / 2;
    
    return {
      x: Math.min(Math.max(x, -maxOffsetX), maxOffsetX),
      y: Math.min(Math.max(y, -maxOffsetY), maxOffsetY)
    };
  }, []);

  // Set the source image natural dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Keep offsets constrained whenever zoom or render sizes change
  useEffect(() => {
    const constrained = constrainOffsets(offsetX, offsetY, renderSize.width, renderSize.height);
    setOffsetX(constrained.x);
    setOffsetY(constrained.y);
  }, [zoom, renderSize, constrainOffsets]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    dragStart.current = { x: e.clientX, y: e.clientY };

    const newX = offsetX + dx;
    const newY = offsetY + dy;
    const constrained = constrainOffsets(newX, newY, renderSize.width, renderSize.height);
    setOffsetX(constrained.x);
    setOffsetY(constrained.y);
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.current.x;
    const dy = e.touches[0].clientY - dragStart.current.y;
    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

    const newX = offsetX + dx;
    const newY = offsetY + dy;
    const constrained = constrainOffsets(newX, newY, renderSize.width, renderSize.height);
    setOffsetX(constrained.x);
    setOffsetY(constrained.y);
  };

  const handleApplyCrop = () => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // Standard output passport dimensions (350x450px has the perfect 35:45 ratio)
      const canvasWidth = 350;
      const canvasHeight = 450;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Fill background with white
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Calculate scaling from screen container size to the canvas resolution
        const S = canvasWidth / containerWidth;
        const rWidthCanvas = baseSize.width * zoom * S;
        const rHeightCanvas = baseSize.height * zoom * S;

        const x0Canvas = (canvasWidth - rWidthCanvas) / 2;
        const y0Canvas = (canvasHeight - rHeightCanvas) / 2;

        const drawX = x0Canvas + offsetX * S;
        const drawY = y0Canvas + offsetY * S;

        ctx.drawImage(img, drawX, drawY, rWidthCanvas, rHeightCanvas);
        
        const croppedBase64 = canvas.toDataURL("image/jpeg", 0.9);
        onCrop(croppedBase64);
      }
    };
    img.src = imageSrc;
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm border border-slate-100 overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Crop Passport Photo</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Drag to move, slider to zoom</p>
          </div>
          <button 
            type="button" 
            onClick={onCancel}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Workspace */}
        <div className="p-6 flex flex-col items-center justify-center bg-slate-50/20">
          <div 
            className="relative overflow-hidden bg-slate-200 border-2 border-indigo-500 rounded-2xl shadow-lg cursor-move select-none"
            style={{ width: `${containerWidth}px`, height: `${containerHeight}px` }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUpOrLeave}
          >
            {naturalSize ? (
              <img 
                src={imageSrc} 
                alt="Crop preview" 
                className="absolute max-w-none pointer-events-none"
                style={{
                  width: `${renderSize.width}px`,
                  height: `${renderSize.height}px`,
                  left: `50%`,
                  top: `50%`,
                  transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`,
                  transformOrigin: "center"
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-500" size={24} />
              </div>
            )}
            
            {/* Overlay passport guidelines */}
            <div className="absolute inset-0 border border-white/20 pointer-events-none rounded-2xl"></div>
            
            {/* Oval guideline for head placement */}
            <div 
              className="absolute inset-x-0 mx-auto border border-dashed border-indigo-400/40 rounded-full pointer-events-none flex flex-col items-center justify-center" 
              style={{ width: "120px", height: "155px", top: "50px" }}
            >
              <div className="text-[8px] font-black tracking-widest text-indigo-400/50 bg-white/70 px-1.5 py-0.5 rounded uppercase pointer-events-none">
                Face Center
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="w-full mt-6 space-y-4">
            {/* Zoom slider */}
            <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm">
              <button 
                type="button"
                onClick={() => setZoom(z => Math.max(1, z - 0.1))}
                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                title="Zoom Out"
              >
                <Minus size={14} />
              </button>
              <input 
                type="range"
                min="1"
                max="4"
                step="0.01"
                value={zoom}
                onChange={e => setZoom(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-slate-150 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <button 
                type="button"
                onClick={() => setZoom(z => Math.min(4, z + 0.1))}
                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                title="Zoom In"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Status indicator */}
            <div className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Scale: <span className="text-indigo-600">{Math.round(zoom * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button 
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleApplyCrop}
            className="px-5 py-2 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md hover:shadow-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check size={14} />
            Crop & Apply
          </button>
        </div>
      </div>
    </div>
  );
}
