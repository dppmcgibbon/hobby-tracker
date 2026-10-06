"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Eraser,
  Hand,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  X,
  Loader2,
  RotateCcw,
  Undo2,
  Redo2,
} from "lucide-react";
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
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Tools: eraser or pan
  const [activeTool, setActiveTool] = useState<"eraser" | "pan">("eraser");
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  // Zoom and Pan states
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Natural image dimensions and computed workspace fit dimensions
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [fitDimensions, setFitDimensions] = useState<{ width: number; height: number } | null>(null);

  // Brush cursor indicator state
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [cursorScale, setCursorScale] = useState<number>(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  // Drawing state
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Pan dragging state refs
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number } | null>(
    null
  );

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

  // Compute dimensions to fill the workspace cleanly at 1x zoom (Fit to Screen)
  const updateFitDimensions = useCallback((imgWidth: number, imgHeight: number) => {
    const container = containerRef.current;
    if (!container || imgWidth <= 0 || imgHeight <= 0) return;

    const availW = Math.max(100, container.clientWidth - 48);
    const availH = Math.max(100, container.clientHeight - 48);
    const fitScale = Math.min(availW / imgWidth, availH / imgHeight);

    setFitDimensions({
      width: Math.max(1, Math.round(imgWidth * fitScale)),
      height: Math.max(1, Math.round(imgHeight * fitScale)),
    });
  }, []);

  // Update fit dimensions when container resizes
  useEffect(() => {
    if (!open || !containerRef.current) return;
    const container = containerRef.current;

    const observer = new ResizeObserver(() => {
      if (naturalSize.width > 0 && naturalSize.height > 0) {
        updateFitDimensions(naturalSize.width, naturalSize.height);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [open, naturalSize, updateFitDimensions]);

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
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
      setActiveTool("eraser");

      let paintAttemptCount = 0;
      const paintImageToCanvas = (img: HTMLImageElement) => {
        if (!active) return;
        const canvas = canvasRef.current;
        if (!canvas) {
          if (paintAttemptCount < 30) {
            paintAttemptCount++;
            requestAnimationFrame(() => {
              if (active) paintImageToCanvas(img);
            });
          }
          return;
        }

        const natW = img.naturalWidth;
        const natH = img.naturalHeight;
        canvas.width = natW;
        canvas.height = natH;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        ctx.clearRect(0, 0, natW, natH);
        ctx.drawImage(img, 0, 0);

        setNaturalSize({ width: natW, height: natH });
        updateFitDimensions(natW, natH);

        // Save initial snapshot
        saveHistorySnapshot();
        setIsLoadingImage(false);

        // Calculate initial display scale
        requestAnimationFrame(() => {
          if (!active) return;
          const rect = canvas.getBoundingClientRect();
          if (rect.width > 0 && canvas.width > 0) {
            setCursorScale(rect.width / canvas.width);
          }
        });
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
          const testCanvas = document.createElement("canvas");
          testCanvas.width = 1;
          testCanvas.height = 1;
          const testCtx = testCanvas.getContext("2d");
          if (testCtx) {
            testCtx.drawImage(directImg, 0, 0, 1, 1, 0, 0, 1, 1);
            testCtx.getImageData(0, 0, 1, 1);
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
  }, [open, imageUrl, sourceBlob, saveHistorySnapshot, updateFitDimensions]);

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

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoomLevel((z) => Math.min(Math.round((z + 0.5) * 10) / 10, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((z) => {
      const next = Math.max(Math.round((z - 0.5) * 10) / 10, 1);
      if (next === 1) {
        setPanOffset({ x: 0, y: 0 });
      }
      return next;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
        return;
      }

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
      } else if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        handleResetZoom();
      } else if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        setActiveTool("eraser");
      } else if (e.key.toLowerCase() === "h") {
        e.preventDefault();
        setActiveTool("pan");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [open, handleUndo, handleRedo, handleZoomIn, handleZoomOut, handleResetZoom]);

  // Global pointer move and up handlers for smooth pan drag
  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (isPanningRef.current && panStartRef.current) {
        const dx = e.clientX - panStartRef.current.clientX;
        const dy = e.clientY - panStartRef.current.clientY;
        setPanOffset({
          x: panStartRef.current.panX + dx,
          y: panStartRef.current.panY + dy,
        });
      }
    };

    const handleGlobalPointerUp = () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        setIsPanning(false);
        panStartRef.current = null;
      }
    };

    window.addEventListener("pointermove", handleGlobalPointerMove);
    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);

    return () => {
      window.removeEventListener("pointermove", handleGlobalPointerMove);
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("pointercancel", handleGlobalPointerUp);
    };
  }, []);

  // Map pointer client coordinates to canvas internal pixel coordinates
  const getCanvasCoords = (e: { clientX: number; clientY: number }) => {
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

  // Start panning
  const startPan = (clientX: number, clientY: number) => {
    isPanningRef.current = true;
    setIsPanning(true);
    panStartRef.current = {
      clientX,
      clientY,
      panX: panOffset.x,
      panY: panOffset.y,
    };
  };

  // Update floating brush indicator
  const updateCursorIndicator = (e: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    if (canvas.width > 0 && canvasRect.width > 0) {
      setCursorScale(canvasRect.width / canvas.width);
    }

    const isInsideCanvas =
      e.clientX >= canvasRect.left &&
      e.clientX <= canvasRect.right &&
      e.clientY >= canvasRect.top &&
      e.clientY <= canvasRect.bottom;

    if (
      activeTool === "eraser" &&
      !isSpacePressed &&
      !isPanningRef.current &&
      isInsideCanvas
    ) {
      setCursorPos({
        x: e.clientX - containerRect.left,
        y: e.clientY - containerRect.top,
      });
    } else {
      setCursorPos(null);
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY;
    setZoomLevel((current) => {
      const factor = delta < 0 ? 1.25 : 0.8;
      const next = Math.min(Math.max(Math.round(current * factor * 10) / 10, 1), 5);
      if (next === 1) {
        setPanOffset({ x: 0, y: 0 });
      }
      return next;
    });
  };

  // Canvas pointer down: either pan or erase
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === "pan" || isSpacePressed || e.button === 1) {
      startPan(e.clientX, e.clientY);
      return;
    }

    if (e.button !== 0) return;
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

  // Canvas pointer move: either continue drawing stroke or track cursor
  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) return;

    updateCursorIndicator(e);

    if (!isDrawingRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

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

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
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

  // Container pointer down: allows panning by clicking workspace background
  const handleContainerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (
      e.target === containerRef.current ||
      activeTool === "pan" ||
      isSpacePressed ||
      e.button === 1 ||
      zoomLevel > 1
    ) {
      startPan(e.clientX, e.clientY);
    }
  };

  const handleContainerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    updateCursorIndicator(e);
  };

  const handleContainerPointerLeave = () => {
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
  const isPanActive = activeTool === "pan" || isSpacePressed;

  return (
    <Dialog open={open} onOpenChange={isApplying ? undefined : onOpenChange}>
      <DialogContent
        className="p-0 overflow-hidden bg-neutral-950 border border-primary/40 text-white shadow-2xl flex flex-col sm:max-w-none max-w-none transition-all duration-150"
        style={{
          width: "min(1600px, 98vw)",
          maxWidth: "98vw",
          height: "95vh",
          maxHeight: "95vh",
        }}
        showCloseButton={!isApplying}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          Brush over areas of the image to erase them and make them transparent.
        </DialogDescription>

        {/* Modal Header Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-primary/25 bg-neutral-900/90 z-20">
          {/* Left: Mode Selection & Title */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-black/60 border border-primary/30 rounded-md p-0.5">
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTool("eraser")}
                      className={`h-7 px-2.5 text-xs font-semibold rounded ${
                        activeTool === "eraser"
                          ? "bg-primary text-black hover:bg-primary"
                          : "text-neutral-300 hover:text-white"
                      }`}
                    >
                      <Eraser className="h-3.5 w-3.5 mr-1" />
                      Eraser
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Eraser Tool (E)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTool("pan")}
                      className={`h-7 px-2.5 text-xs font-semibold rounded ${
                        activeTool === "pan"
                          ? "bg-primary text-black hover:bg-primary"
                          : "text-neutral-300 hover:text-white"
                      }`}
                    >
                      <Hand className="h-3.5 w-3.5 mr-1" />
                      Pan
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Pan Tool (H or hold Space)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="h-4 w-px bg-primary/20 hidden sm:block" />
            <h3 className="text-xs sm:text-sm font-bold text-neutral-100 truncate max-w-[200px] sm:max-w-xs">
              {title}
            </h3>
          </div>

          {/* Center/Right: Brush Size & Zoom Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {/* Brush Size Controls */}
            <div className="flex items-center gap-2 bg-neutral-900/80 border border-primary/20 rounded-md px-2 py-1">
              <span className="text-[11px] text-neutral-300 font-medium whitespace-nowrap">
                Brush:
              </span>
              <input
                type="range"
                min={5}
                max={150}
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-20 sm:w-28 h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-[11px] font-mono font-bold text-primary w-9 text-right">
                {brushSize}px
              </span>

              {/* Quick Size Presets */}
              <div className="hidden md:flex items-center gap-0.5 ml-1 bg-black/60 border border-primary/20 rounded p-0.5">
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

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-neutral-900/80 border border-primary/20 rounded-md p-1">
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleZoomOut}
                      disabled={zoomLevel <= 1}
                      className="h-7 w-7 text-neutral-300 hover:text-white disabled:opacity-30"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Zoom Out (-)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResetZoom}
                      className="h-7 px-2 font-mono text-[11px] font-bold text-primary hover:bg-primary/15"
                    >
                      {zoomLevel === 1 ? "Fit" : `${Math.round(zoomLevel * 100)}%`}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Reset to Fit (0)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleZoomIn}
                      disabled={zoomLevel >= 5}
                      className="h-7 w-7 text-neutral-300 hover:text-white disabled:opacity-30"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Zoom In (+)</TooltipContent>
                </Tooltip>

                <div className="h-3.5 w-px bg-primary/20 mx-0.5" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleResetZoom}
                      className="h-7 w-7 text-neutral-300 hover:text-white"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Fit to Screen</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Interactive Workspace Area */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onPointerDown={handleContainerPointerDown}
          onPointerMove={handleContainerPointerMove}
          onPointerLeave={handleContainerPointerLeave}
          className="relative flex-1 min-h-0 w-full flex items-center justify-center p-4 bg-neutral-950 overflow-hidden select-none"
          style={{
            cursor: isPanActive ? (isPanning ? "grabbing" : "grab") : "default",
          }}
        >
          {isLoadingImage && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-neutral-950/80">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-neutral-400">Loading image for editing...</p>
            </div>
          )}

          {/* Canvas Wrapper with Zoom & Pan Transform */}
          <div
            ref={canvasWrapperRef}
            style={{
              width: fitDimensions ? `${fitDimensions.width}px` : "auto",
              height: fitDimensions ? `${fitDimensions.height}px` : "auto",
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
              transformOrigin: "center center",
              transition: isPanning || isDrawingRef.current ? "none" : "transform 0.12s ease-out",
              visibility: isLoadingImage || !fitDimensions ? "hidden" : "visible",
            }}
            className="relative inline-block overflow-hidden rounded border border-neutral-800 shadow-2xl [background-image:linear-gradient(45deg,#1c1917_25%,transparent_25%),linear-gradient(-45deg,#1c1917_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1c1917_75%),linear-gradient(-45deg,transparent_75%,#1c1917_75%)] [background-size:16px_16px] [background-position:0_0,0_8px,8px_-8px,-8px_0] bg-neutral-900"
          >
            <canvas
              ref={canvasRef}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerCancel={handleCanvasPointerUp}
              style={{
                width: fitDimensions ? `${fitDimensions.width}px` : "auto",
                height: fitDimensions ? `${fitDimensions.height}px` : "auto",
              }}
              className={`block touch-none select-none ${
                isPanActive
                  ? isPanning
                    ? "cursor-grabbing"
                    : "cursor-grab"
                  : "cursor-crosshair"
              }`}
            />
          </div>

          {/* Floating Brush Ring Cursor */}
          {cursorPos && !isLoadingImage && !isPanActive && (
            <div
              className="pointer-events-none absolute rounded-full border-2 border-primary bg-primary/20 -translate-x-1/2 -translate-y-1/2 z-40 shadow-sm transition-none"
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
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-primary/25 bg-neutral-900/90 z-20">
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
                    className="h-8 px-2.5 text-xs text-neutral-300 hover:text-white disabled:opacity-30"
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
                    className="h-8 px-2.5 text-xs text-neutral-300 hover:text-white disabled:opacity-30"
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
                    className="h-8 px-2.5 text-xs text-neutral-400 hover:text-white disabled:opacity-30"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Reset
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Revert all eraser strokes</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Keyboard shortcut tips */}
            <span className="hidden lg:inline-flex items-center gap-2 ml-4 text-[11px] text-neutral-400">
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono text-[10px]">
                  Space
                </kbd>{" "}
                + drag to pan
              </span>
              <span>•</span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono text-[10px]">
                  Scroll
                </kbd>{" "}
                to zoom
              </span>
              <span>•</span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono text-[10px]">
                  [
                </kbd>{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono text-[10px]">
                  ]
                </kbd>{" "}
                brush size
              </span>
            </span>
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
              className="bg-primary hover:bg-primary/90 text-black font-semibold text-xs h-8 px-3.5 shadow-gold"
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
