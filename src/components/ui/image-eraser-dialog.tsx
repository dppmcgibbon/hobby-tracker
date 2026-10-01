"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eraser, Check, X, Loader2, RotateCcw, Undo2, Redo2, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import { fetchPhotoBlob } from "@/lib/photos";

interface ImageEraserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  sourceBlob?: Blob | null;
  title?: string;
  onApplyErase: (erasedBlob: Blob) => Promise<void>;
}

const BRUSH_PRESETS = [10, 25, 50, 80, 120];

export function ImageEraserDialog({
  open,
  onOpenChange,
  imageUrl,
  sourceBlob,
  title = "Eraser Tool",
  onApplyErase,
}: ImageEraserDialogProps) {
  const [brushSize, setBrushSize] = useState<number>(35);
  const [isApplying, setIsApplying] = useState(false);
  const [isZoomed, setIsZoomed] = useState(true);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Brush cursor indicator state
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [cursorScale, setCursorScale] = useState<number>(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Drawing state
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // History stack for Undo / Redo
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef<number>(-1);

  const updateHistoryState = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  const saveHistorySnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    try {
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Discard future redo history beyond current index
      const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
      newHistory.push(snapshot);

      // Keep max 25 states to prevent memory bloat
      if (newHistory.length > 25) {
        newHistory.shift();
      }

      historyRef.current = newHistory;
      historyIndexRef.current = newHistory.length - 1;
      updateHistoryState();
    } catch (err) {
      console.error("Failed to save canvas history snapshot:", err);
    }
  }, [updateHistoryState]);

  // Load clean Blob and paint onto canvas
  useEffect(() => {
    let active = true;
    let objectUrlToRevoke: string | null = null;

    async function initializeCanvas() {
      if (!open || !imageUrl) return;
      setIsLoadingImage(true);
      historyRef.current = [];
      historyIndexRef.current = -1;
      setCanUndo(false);
      setCanRedo(false);
      setCursorPos(null);

      let paintAttemptCount = 0;
      const paintImageToCanvas = (img: HTMLImageElement) => {
        if (!active) return;
        const canvas = canvasRef.current;
        if (!canvas) {
          // If canvas ref isn't ready in DOM yet, retry on next frame
          if (paintAttemptCount < 30) {
            paintAttemptCount++;
            requestAnimationFrame(() => {
              if (active) paintImageToCanvas(img);
            });
          }
          return;
        }

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        // Save initial snapshot
        saveHistorySnapshot();
        setIsLoadingImage(false);

        // Calculate initial display scale
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && canvas.width > 0) {
          setCursorScale(rect.width / canvas.width);
        }
      };

      // 1. If sourceBlob exists, load from blob URL directly
      if (sourceBlob) {
        const objectUrl = URL.createObjectURL(sourceBlob);
        objectUrlToRevoke = objectUrl;
        const img = new Image();
        img.onload = () => paintImageToCanvas(img);
        img.onerror = () => loadViaProxyBlob();
        img.src = objectUrl;
        return;
      }

      // 2. Try fast direct image loading with CORS
      let directLoaded = false;
      const directImg = new Image();
      directImg.crossOrigin = "anonymous";
      directImg.onload = () => {
        directLoaded = true;
        try {
          // Verify canvas is not tainted by reading 1 pixel
          const testCanvas = document.createElement("canvas");
          testCanvas.width = 1;
          testCanvas.height = 1;
          const testCtx = testCanvas.getContext("2d");
          if (testCtx) {
            testCtx.drawImage(directImg, 0, 0, 1, 1, 0, 0, 1, 1);
            testCtx.getImageData(0, 0, 1, 1); // throws SecurityError if tainted
            paintImageToCanvas(directImg);
            return;
          }
        } catch {
          // Canvas tainted, fallback to proxy blob
        }
        loadViaProxyBlob();
      };
      directImg.onerror = () => {
        directLoaded = true;
        loadViaProxyBlob();
      };
      directImg.src = imageUrl;

      // Timeout fallback in case direct load hangs
      const directTimeout = setTimeout(() => {
        if (!directLoaded && active) {
          loadViaProxyBlob();
        }
      }, 2500);

      let isProxyLoading = false;
      // 3. Fallback: fetch via same-origin proxy
      async function loadViaProxyBlob() {
        if (isProxyLoading || !active) return;
        isProxyLoading = true;
        clearTimeout(directTimeout);
        try {
          const b = await fetchPhotoBlob(imageUrl);
          if (!active) return;
          const objectUrl = URL.createObjectURL(b);
          objectUrlToRevoke = objectUrl;
          const img = new Image();
          img.onload = () => paintImageToCanvas(img);
          img.onerror = () => {
            if (active) {
              toast.error("Failed to load image");
              setIsLoadingImage(false);
            }
          };
          img.src = objectUrl;
        } catch (err) {
          if (!active) return;
          console.error("Failed to load image for eraser:", err);
          toast.error("Failed to load image");
          setIsLoadingImage(false);
        }
      }
    }

    if (open) {
      initializeCanvas();
    }

    return () => {
      active = false;
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [open, imageUrl, sourceBlob, saveHistorySnapshot]);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    historyIndexRef.current -= 1;
    const targetState = historyRef.current[historyIndexRef.current];
    if (targetState) {
      ctx.putImageData(targetState, 0, 0);
    }
    updateHistoryState();
  }, [updateHistoryState]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    historyIndexRef.current += 1;
    const targetState = historyRef.current[historyIndexRef.current];
    if (targetState) {
      ctx.putImageData(targetState, 0, 0);
    }
    updateHistoryState();
  }, [updateHistoryState]);

  const handleReset = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    historyIndexRef.current = 0;
    const initialState = historyRef.current[0];
    if (initialState) {
      ctx.putImageData(initialState, 0, 0);
    }
    updateHistoryState();
    toast.info("Image reset to original");
  }, [updateHistoryState]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if (e.key === "[") {
        e.preventDefault();
        setBrushSize((s) => Math.max(5, s - 5));
      } else if (e.key === "]") {
        e.preventDefault();
        setBrushSize((s) => Math.min(150, s + 5));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleUndo, handleRedo]);

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    lastPosRef.current = coords;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Erase point immediately on click
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Track cursor for floating brush ring
    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const currentScale = canvasRect.width / canvas.width;
    setCursorScale(currentScale);

    setCursorPos({
      x: e.clientX - containerRect.left,
      y: e.clientY - containerRect.top,
    });

    if (!isDrawingRef.current) return;

    const coords = getCanvasCoords(e);
    const last = lastPosRef.current || coords;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    ctx.restore();

    lastPosRef.current = coords;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }

    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPosRef.current = null;
      saveHistorySnapshot();
    }
  };

  const handlePointerLeave = () => {
    setCursorPos(null);
  };

  const handleApply = async () => {
    if (isApplying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsApplying(true);
    try {
      const erasedBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Failed to export erased image"))),
          "image/png"
        );
      });

      await onApplyErase(erasedBlob);
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to apply edits";
      console.error("Eraser error:", err);
      toast.error(msg);
    } finally {
      setIsApplying(false);
    }
  };

  const displayedBrushRadius = Math.max(2, (brushSize / 2) * cursorScale);

  return (
    <Dialog open={open} onOpenChange={isApplying ? undefined : onOpenChange}>
      <DialogContent
        className="p-0 overflow-hidden bg-neutral-950 border border-primary/30 text-white shadow-2xl flex flex-col sm:max-w-none max-w-none transition-all duration-150"
        style={
          isZoomed
            ? { width: "95vw", maxWidth: "95vw", height: "92vh", maxHeight: "92vh" }
            : { width: "min(896px, calc(100vw - 2rem))", maxWidth: "896px", height: "min(750px, 85vh)", maxHeight: "85vh" }
        }
        showCloseButton={!isApplying}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          Brush over areas of the image to erase them and make them transparent.
        </DialogDescription>

        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-primary/20 bg-neutral-900/80">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-neutral-300 hover:text-white"
              onClick={() => setIsZoomed((z) => !z)}
              title={isZoomed ? "Reduce size" : "Increase size"}
            >
              {isZoomed ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <div className="h-4 w-px bg-primary/20" />
            <Eraser className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-neutral-100">{title}</h3>
            <span className="hidden sm:inline text-xs text-neutral-400">
              — Brush to make transparent
            </span>
          </div>

          {/* Brush Size Controls */}
          <div className="flex items-center gap-2.5 mr-6 sm:mr-8">
            <span className="text-xs text-neutral-300 font-medium whitespace-nowrap">Size:</span>
            <input
              type="range"
              min={5}
              max={150}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-24 sm:w-32 h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <span className="text-xs font-mono font-semibold text-primary w-8 text-right">
              {brushSize}px
            </span>

            {/* Quick Size Presets */}
            <div className="hidden sm:flex items-center gap-1 bg-black/60 border border-primary/20 rounded p-0.5 ml-1">
              {BRUSH_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBrushSize(preset)}
                  className={`px-1.5 py-0.5 text-[10px] rounded transition-colors font-mono ${
                    brushSize === preset
                      ? "bg-primary text-black font-bold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Interactive Workspace Area */}
        <div
          ref={containerRef}
          className="relative flex-1 min-h-0 w-full flex items-center justify-center p-3 sm:p-5 bg-neutral-950 overflow-hidden select-none"
        >
          {isLoadingImage && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-neutral-950/80">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-neutral-400">Loading image for editing...</p>
            </div>
          )}
          <div
            className={`relative inline-block max-w-full ${isZoomed ? "max-h-[78vh]" : "max-h-[65vh]"} overflow-hidden rounded border border-neutral-800 shadow-2xl [background-image:linear-gradient(45deg,#1c1917_25%,transparent_25%),linear-gradient(-45deg,#1c1917_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1c1917_75%),linear-gradient(-45deg,transparent_75%,#1c1917_75%)] [background-size:16px_16px] [background-position:0_0,0_8px,8px_-8px,-8px_0] bg-neutral-900`}
            style={{ visibility: isLoadingImage ? "hidden" : "visible" }}
          >
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              className={`${isZoomed ? "max-h-[78vh]" : "max-h-[65vh]"} w-auto max-w-full object-contain block cursor-crosshair touch-none`}
            />
          </div>

          {/* Floating Brush Ring Cursor */}
          {cursorPos && !isLoadingImage && (
            <div
              className="pointer-events-none absolute rounded-full border border-primary bg-primary/20 -translate-x-1/2 -translate-y-1/2 z-30 shadow-sm"
              style={{
                left: cursorPos.x,
                top: cursorPos.y,
                width: displayedBrushRadius * 2,
                height: displayedBrushRadius * 2,
              }}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-primary/20 bg-neutral-900/80">
          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleUndo}
                    disabled={!canUndo || isApplying}
                    className="h-8 px-2 text-xs text-neutral-300 hover:text-white disabled:opacity-30"
                  >
                    <Undo2 className="h-4 w-4 mr-1 text-primary" />
                    Undo
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Undo last stroke (Ctrl+Z)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRedo}
                    disabled={!canRedo || isApplying}
                    className="h-8 px-2 text-xs text-neutral-300 hover:text-white disabled:opacity-30"
                  >
                    <Redo2 className="h-4 w-4 mr-1 text-primary" />
                    Redo
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Redo (Ctrl+Shift+Z)</TooltipContent>
              </Tooltip>

              <div className="h-4 w-px bg-primary/20 mx-1 hidden sm:block" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    disabled={!canUndo || isApplying}
                    className="h-8 px-2 text-xs text-neutral-400 hover:text-white disabled:opacity-30"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Reset
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Revert all eraser strokes</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isApplying}
              className="text-xs text-neutral-300 hover:text-white h-8"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleApply}
              disabled={isApplying || isLoadingImage}
              className="bg-primary hover:bg-primary/90 text-black font-semibold text-xs h-8 px-3 shadow-gold"
            >
              {isApplying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1.5" />
                  Apply & Save Erase
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
