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
  Square,
  Triangle,
  MousePointerClick,
} from "lucide-react";
import { toast } from "sonner";
import { fetchPhotoBlob } from "@/lib/photos";

export type EraserTool = "eraser" | "rectangle" | "triangle" | "pan";
export type TriangleMode = "drag" | "threePoint";
export type TriangleOrientation = "auto" | "up" | "down" | "left" | "right";

interface Point {
  x: number;
  y: number;
}

interface DragRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DragTriangle {
  p1: Point;
  p2: Point;
  p3: Point;
  w: number;
  h: number;
}

interface ImageEraserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  sourceBlob?: Blob | null;
  title?: string;
  onApplyErase: (erasedBlob: Blob) => Promise<void>;
}

const BRUSH_PRESETS = [10, 25, 50, 80, 120];

function computeDragRect(
  start: Point,
  current: Point,
  lockSquare: boolean,
  bounds: { width: number; height: number }
): DragRect {
  const clampX = (v: number) => Math.max(0, Math.min(bounds.width, v));
  const clampY = (v: number) => Math.max(0, Math.min(bounds.height, v));

  let endX = current.x;
  let endY = current.y;

  if (lockSquare) {
    const dx = current.x - start.x;
    const dy = current.y - start.y;
    let size = Math.max(Math.abs(dx), Math.abs(dy));
    const signX = dx >= 0 ? 1 : -1;
    const signY = dy >= 0 ? 1 : -1;
    const maxAllowedX = dx >= 0 ? bounds.width - start.x : start.x;
    const maxAllowedY = dy >= 0 ? bounds.height - start.y : start.y;
    size = Math.min(size, Math.max(0, maxAllowedX), Math.max(0, maxAllowedY));
    endX = start.x + signX * size;
    endY = start.y + signY * size;
  }

  const cStartX = clampX(start.x);
  const cStartY = clampY(start.y);
  const cEndX = clampX(endX);
  const cEndY = clampY(endY);

  const x = Math.min(cStartX, cEndX);
  const y = Math.min(cStartY, cEndY);
  const w = Math.abs(cEndX - cStartX);
  const h = Math.abs(cEndY - cStartY);

  return { x, y, w, h };
}

function computeDragTriangle(
  start: Point,
  current: Point,
  isShift: boolean,
  orientation: TriangleOrientation,
  bounds: { width: number; height: number }
): DragTriangle {
  const clampX = (v: number) => Math.max(0, Math.min(bounds.width, v));
  const clampY = (v: number) => Math.max(0, Math.min(bounds.height, v));

  let endX = current.x;
  let endY = current.y;

  if (isShift) {
    const dx = current.x - start.x;
    const dy = current.y - start.y;
    let size = Math.max(Math.abs(dx), Math.abs(dy));
    const signX = dx >= 0 ? 1 : -1;
    const signY = dy >= 0 ? 1 : -1;
    const maxAllowedX = dx >= 0 ? bounds.width - start.x : start.x;
    const maxAllowedY = dy >= 0 ? bounds.height - start.y : start.y;
    size = Math.min(size, Math.max(0, maxAllowedX), Math.max(0, maxAllowedY));
    endX = start.x + signX * size;
    endY = start.y + signY * size;
  }

  const cStartX = clampX(start.x);
  const cStartY = clampY(start.y);
  const cEndX = clampX(endX);
  const cEndY = clampY(endY);

  const minX = Math.min(cStartX, cEndX);
  const maxX = Math.max(cStartX, cEndX);
  const minY = Math.min(cStartY, cEndY);
  const maxY = Math.max(cStartY, cEndY);

  const w = maxX - minX;
  const h = maxY - minY;
  const midX = minX + w / 2;
  const midY = minY + h / 2;

  let p1: Point;
  let p2: Point;
  let p3: Point;

  const resolvedOrient =
    orientation === "auto"
      ? current.y >= start.y
        ? "up" // Dragging down: apex at top, base at bottom
        : "down" // Dragging up: apex at bottom, base at top
      : orientation;

  switch (resolvedOrient) {
    case "up":
      p1 = { x: midX, y: minY };
      p2 = { x: minX, y: maxY };
      p3 = { x: maxX, y: maxY };
      break;
    case "down":
      p1 = { x: midX, y: maxY };
      p2 = { x: minX, y: minY };
      p3 = { x: maxX, y: minY };
      break;
    case "left":
      p1 = { x: minX, y: midY };
      p2 = { x: maxX, y: minY };
      p3 = { x: maxX, y: maxY };
      break;
    case "right":
      p1 = { x: maxX, y: midY };
      p2 = { x: minX, y: minY };
      p3 = { x: minX, y: maxY };
      break;
    default:
      p1 = { x: midX, y: minY };
      p2 = { x: minX, y: maxY };
      p3 = { x: maxX, y: maxY };
  }

  return { p1, p2, p3, w, h };
}

export function ImageEraserDialog({
  open,
  onOpenChange,
  imageUrl,
  sourceBlob,
  title = "Eraser Tool",
  onApplyErase,
}: ImageEraserDialogProps) {
  // Brush options
  const [brushSize, setBrushSize] = useState<number>(35);
  const [isApplying, setIsApplying] = useState(false);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Active Tool state
  const [activeTool, setActiveTool] = useState<EraserTool>("eraser");
  const [lockSquare, setLockSquare] = useState(false);
  const [triangleMode, setTriangleMode] = useState<TriangleMode>("drag");
  const [triangleOrientation, setTriangleOrientation] = useState<TriangleOrientation>("auto");

  // Pan states
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  // Zoom and Pan states
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });

  // Natural image dimensions and computed workspace fit dimensions
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [fitDimensions, setFitDimensions] = useState<{ width: number; height: number } | null>(
    null
  );

  // Brush cursor indicator state
  const [cursorPos, setCursorPos] = useState<Point | null>(null);
  const [cursorScale, setCursorScale] = useState<number>(1);

  // Shape drag state (for rectangle and drag-triangle)
  const [shapeDrag, setShapeDrag] = useState<{
    start: Point;
    current: Point;
    isShift: boolean;
  } | null>(null);
  const isDraggingShapeRef = useRef(false);
  const shapeStartRef = useRef<Point | null>(null);

  // 3-Point triangle state
  const [threePoints, setThreePoints] = useState<Point[]>([]);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  // Freehand brush drawing state
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<Point | null>(null);

  // Pan dragging state refs
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{
    clientX: number;
    clientY: number;
    panX: number;
    panY: number;
  } | null>(null);

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

  // Keep cursorScale in sync with zoom, pan, and dimensions
  useEffect(() => {
    const updateScale = () => {
      const canvas = canvasRef.current;
      if (!canvas || canvas.width <= 0) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0) {
        setCursorScale(rect.width / canvas.width);
      }
    };

    updateScale();
    const timer = setTimeout(updateScale, 150);
    return () => clearTimeout(timer);
  }, [zoomLevel, fitDimensions, naturalSize, panOffset]);

  // Reset helper when switching tools or opening dialog
  const clearIncompleteShapes = useCallback(() => {
    isDraggingShapeRef.current = false;
    shapeStartRef.current = null;
    setShapeDrag(null);
    setThreePoints([]);
    setHoverPoint(null);
  }, []);

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
      clearIncompleteShapes();

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
  }, [open, imageUrl, sourceBlob, saveHistorySnapshot, updateFitDimensions, clearIncompleteShapes]);

  const handleUndo = useCallback(() => {
    clearIncompleteShapes();
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
  }, [updateHistoryState, clearIncompleteShapes]);

  const handleRedo = useCallback(() => {
    clearIncompleteShapes();
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
  }, [updateHistoryState, clearIncompleteShapes]);

  const handleReset = useCallback(() => {
    clearIncompleteShapes();
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
  }, [updateHistoryState, clearIncompleteShapes]);

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
        clearIncompleteShapes();
      } else if (e.key.toLowerCase() === "r" || e.key.toLowerCase() === "s") {
        e.preventDefault();
        setActiveTool("rectangle");
        clearIncompleteShapes();
      } else if (e.key.toLowerCase() === "t") {
        e.preventDefault();
        setActiveTool("triangle");
      } else if (e.key.toLowerCase() === "h") {
        e.preventDefault();
        setActiveTool("pan");
        clearIncompleteShapes();
      } else if (e.key === "Escape") {
        if (isDraggingShapeRef.current || shapeDrag) {
          e.preventDefault();
          clearIncompleteShapes();
          toast.info("Shape drawing cancelled");
        } else if (threePoints.length > 0) {
          e.preventDefault();
          setThreePoints([]);
          setHoverPoint(null);
          toast.info("Triangle points cleared");
        }
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
  }, [
    open,
    handleUndo,
    handleRedo,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    shapeDrag,
    threePoints.length,
    clearIncompleteShapes,
  ]);

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
      if (isDraggingShapeRef.current) {
        isDraggingShapeRef.current = false;
        shapeStartRef.current = null;
        setShapeDrag(null);
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
  const getCanvasCoords = (e: { clientX: number; clientY: number }): Point => {
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

    if (activeTool === "eraser" && !isSpacePressed && !isPanningRef.current && isInsideCanvas) {
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

  // Canvas pointer down
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === "pan" || isSpacePressed || e.button === 1) {
      startPan(e.clientX, e.clientY);
      return;
    }

    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const coords = getCanvasCoords(e);

    // 1. Eraser Freehand Brush
    if (activeTool === "eraser") {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      isDrawingRef.current = true;
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
      return;
    }

    // 2. Rectangle / Square Marquee Erase
    if (activeTool === "rectangle") {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      isDraggingShapeRef.current = true;
      shapeStartRef.current = coords;
      setShapeDrag({
        start: coords,
        current: coords,
        isShift: e.shiftKey || lockSquare,
      });
      return;
    }

    // 3. Triangle Erase Tool
    if (activeTool === "triangle") {
      if (triangleMode === "drag") {
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        isDraggingShapeRef.current = true;
        shapeStartRef.current = coords;
        setShapeDrag({
          start: coords,
          current: coords,
          isShift: e.shiftKey,
        });
        return;
      }

      if (triangleMode === "threePoint") {
        const clampedCoords: Point = {
          x: Math.max(0, Math.min(canvas.width, coords.x)),
          y: Math.max(0, Math.min(canvas.height, coords.y)),
        };

        if (threePoints.length === 0) {
          setThreePoints([clampedCoords]);
        } else if (threePoints.length === 1) {
          setThreePoints([threePoints[0], clampedCoords]);
        } else if (threePoints.length === 2) {
          // Commit 3-point triangle erase!
          const p1 = threePoints[0];
          const p2 = threePoints[1];
          const p3 = clampedCoords;

          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.save();
            ctx.globalCompositeOperation = "destination-out";
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            saveHistorySnapshot();
          }

          setThreePoints([]);
          setHoverPoint(null);
        }
      }
    }
  };

  // Canvas pointer move
  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) return;
    e.stopPropagation();

    updateCursorIndicator(e);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const coords = getCanvasCoords(e);

    // Brush drawing stroke
    if (activeTool === "eraser" && isDrawingRef.current) {
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
      return;
    }

    // Drag shape marquee update
    if (isDraggingShapeRef.current && shapeStartRef.current) {
      setShapeDrag({
        start: shapeStartRef.current,
        current: coords,
        isShift: e.shiftKey || (activeTool === "rectangle" && lockSquare),
      });
      return;
    }

    // 3-point triangle hover point update
    if (activeTool === "triangle" && triangleMode === "threePoint") {
      setHoverPoint({
        x: Math.max(0, Math.min(canvas.width, coords.x)),
        y: Math.max(0, Math.min(canvas.height, coords.y)),
      });
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }

    // Freehand brush commit
    if (activeTool === "eraser" && isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPosRef.current = null;
      saveHistorySnapshot();
      return;
    }

    // Shape Drag Marquee commit
    if (isDraggingShapeRef.current && shapeStartRef.current && canvas) {
      const coords = getCanvasCoords(e);
      const isShift = e.shiftKey || (activeTool === "rectangle" && lockSquare);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      if (activeTool === "rectangle" && ctx) {
        const rect = computeDragRect(shapeStartRef.current, coords, isShift, {
          width: canvas.width,
          height: canvas.height,
        });

        if (rect.w >= 1 && rect.h >= 1) {
          ctx.save();
          ctx.globalCompositeOperation = "destination-out";
          ctx.beginPath();
          ctx.rect(rect.x, rect.y, rect.w, rect.h);
          ctx.fill();
          ctx.restore();
          saveHistorySnapshot();
        }
      } else if (activeTool === "triangle" && triangleMode === "drag" && ctx) {
        const tri = computeDragTriangle(
          shapeStartRef.current,
          coords,
          isShift,
          triangleOrientation,
          { width: canvas.width, height: canvas.height }
        );

        if (tri.w >= 1 && tri.h >= 1) {
          ctx.save();
          ctx.globalCompositeOperation = "destination-out";
          ctx.beginPath();
          ctx.moveTo(tri.p1.x, tri.p1.y);
          ctx.lineTo(tri.p2.x, tri.p2.y);
          ctx.lineTo(tri.p3.x, tri.p3.y);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          saveHistorySnapshot();
        }
      }

      isDraggingShapeRef.current = false;
      shapeStartRef.current = null;
      setShapeDrag(null);
    }
  };

  const handleCanvasPointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    isDrawingRef.current = false;
    lastPosRef.current = null;
    isDraggingShapeRef.current = false;
    shapeStartRef.current = null;
    setShapeDrag(null);
  };

  // Container pointer down: allows panning by clicking workspace background
  const handleContainerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only pan if clicking on the workspace background outside the canvas,
    // or if the Pan tool or Spacebar is active, or middle mouse button
    if (
      e.target === containerRef.current ||
      activeTool === "pan" ||
      isSpacePressed ||
      e.button === 1
    ) {
      startPan(e.clientX, e.clientY);
    }
  };

  const handleContainerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    updateCursorIndicator(e);

    // Fallback if pointer dragged outside canvas boundary
    if (isDraggingShapeRef.current && shapeStartRef.current) {
      const coords = getCanvasCoords(e);
      setShapeDrag({
        start: shapeStartRef.current,
        current: coords,
        isShift: e.shiftKey || (activeTool === "rectangle" && lockSquare),
      });
    } else if (activeTool === "triangle" && triangleMode === "threePoint") {
      const canvas = canvasRef.current;
      if (canvas) {
        const coords = getCanvasCoords(e);
        setHoverPoint({
          x: Math.max(0, Math.min(canvas.width, coords.x)),
          y: Math.max(0, Math.min(canvas.height, coords.y)),
        });
      }
    }
  };

  const handleContainerPointerLeave = () => {
    setCursorPos(null);
    setHoverPoint(null);
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

  // Relative SVG metrics
  const safeCursorScale = Math.max(0.001, cursorScale);
  const svgStrokeWidth = Math.max(1, 2 / safeCursorScale);
  const svgHandleRadius = Math.max(2, 4.5 / safeCursorScale);
  const svgDashArray = `${6 / safeCursorScale} ${4 / safeCursorScale}`;

  return (
    <Dialog open={open} onOpenChange={isApplying ? undefined : onOpenChange}>
      <DialogContent
        onEscapeKeyDown={(e) => {
          if (isDraggingShapeRef.current || shapeDrag || threePoints.length > 0) {
            e.preventDefault();
            clearIncompleteShapes();
            toast.info("Shape drawing cancelled");
          }
        }}
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
          Erase areas of the image using brush strokes, square marquee, or triangle cutouts to make
          them transparent.
        </DialogDescription>

        {/* Modal Header Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2 border-b border-primary/25 bg-neutral-900/90 z-20">
          {/* Left: Mode Selection & Dialog Title */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-black/60 border border-primary/30 rounded-md p-0.5">
              <TooltipProvider delayDuration={150}>
                {/* 1. Freehand Brush Eraser */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActiveTool("eraser");
                        clearIncompleteShapes();
                      }}
                      className={`h-7 px-2.5 text-xs font-semibold rounded ${
                        activeTool === "eraser"
                          ? "bg-primary text-black hover:bg-primary"
                          : "text-neutral-300 hover:text-white"
                      }`}
                    >
                      <Eraser className="h-3.5 w-3.5 mr-1" />
                      Brush
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Brush Eraser (E)</TooltipContent>
                </Tooltip>

                {/* 2. Square / Rect Shape Eraser */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActiveTool("rectangle");
                        clearIncompleteShapes();
                      }}
                      className={`h-7 px-2.5 text-xs font-semibold rounded ${
                        activeTool === "rectangle"
                          ? "bg-primary text-black hover:bg-primary"
                          : "text-neutral-300 hover:text-white"
                      }`}
                    >
                      <Square className="h-3.5 w-3.5 mr-1" />
                      Square
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Square / Rect Marquee Eraser (R or S)
                  </TooltipContent>
                </Tooltip>

                {/* 3. Triangle Shape Eraser */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActiveTool("triangle");
                        clearIncompleteShapes();
                      }}
                      className={`h-7 px-2.5 text-xs font-semibold rounded ${
                        activeTool === "triangle"
                          ? "bg-primary text-black hover:bg-primary"
                          : "text-neutral-300 hover:text-white"
                      }`}
                    >
                      <Triangle className="h-3.5 w-3.5 mr-1" />
                      Triangle
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Triangle Eraser (T)</TooltipContent>
                </Tooltip>

                {/* 4. Pan Tool */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActiveTool("pan");
                        clearIncompleteShapes();
                      }}
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
            <h3 className="text-xs sm:text-sm font-bold text-neutral-100 truncate max-w-[150px] sm:max-w-xs">
              {title}
            </h3>
          </div>

          {/* Center: Contextual Tool Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Tool 1 Options: Brush Controls */}
            {activeTool === "eraser" && (
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
            )}

            {/* Tool 2 Options: Square / Rect Controls */}
            {activeTool === "rectangle" && (
              <div className="flex items-center gap-1.5 bg-neutral-900/80 border border-primary/20 rounded-md p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setLockSquare(false)}
                  className={`h-6 px-2 text-[11px] rounded transition-colors ${
                    !lockSquare
                      ? "bg-primary text-black font-bold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Free Rect
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setLockSquare(true)}
                  className={`h-6 px-2 text-[11px] rounded transition-colors ${
                    lockSquare
                      ? "bg-primary text-black font-bold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  1:1 Square
                </Button>
                <span className="text-[10px] text-neutral-400 ml-1 hidden lg:inline">
                  (or hold{" "}
                  <kbd className="font-mono text-[9px] bg-neutral-800 px-1 py-0.5 rounded border border-neutral-700 text-neutral-300">
                    Shift
                  </kbd>
                  )
                </span>
              </div>
            )}

            {/* Tool 3 Options: Triangle Mode & Orientations */}
            {activeTool === "triangle" && (
              <div className="flex items-center gap-1.5 bg-neutral-900/80 border border-primary/20 rounded-md p-1">
                <div className="flex items-center bg-black/50 rounded p-0.5 border border-primary/20">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTriangleMode("drag");
                      setThreePoints([]);
                    }}
                    className={`h-6 px-2 text-[11px] font-medium rounded ${
                      triangleMode === "drag"
                        ? "bg-primary text-black font-bold"
                        : "text-neutral-300 hover:text-white"
                    }`}
                  >
                    Drag Box
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTriangleMode("threePoint");
                      clearIncompleteShapes();
                    }}
                    className={`h-6 px-2 text-[11px] font-medium rounded ${
                      triangleMode === "threePoint"
                        ? "bg-primary text-black font-bold"
                        : "text-neutral-300 hover:text-white"
                    }`}
                  >
                    <MousePointerClick className="h-3 w-3 mr-1" />
                    3-Point
                  </Button>
                </div>

                {triangleMode === "drag" && (
                  <div className="flex items-center gap-1 ml-1">
                    <span className="text-[10px] text-neutral-400 hidden sm:inline">Apex:</span>
                    {(
                      [
                        { id: "auto", label: "Auto" },
                        { id: "up", label: "▲ Up" },
                        { id: "down", label: "▼ Down" },
                      ] as const
                    ).map((orient) => (
                      <button
                        key={orient.id}
                        type="button"
                        onClick={() => setTriangleOrientation(orient.id)}
                        className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                          triangleOrientation === orient.id
                            ? "bg-primary/20 border-primary text-primary font-bold"
                            : "border-transparent text-neutral-400 hover:text-white"
                        }`}
                      >
                        {orient.label}
                      </button>
                    ))}
                  </div>
                )}

                {triangleMode === "threePoint" && threePoints.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setThreePoints([]);
                      setHoverPoint(null);
                    }}
                    className="h-6 px-2 text-[11px] text-red-400 hover:text-red-300 hover:bg-red-950/40 ml-1 font-semibold"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Reset ({threePoints.length}/3)
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Right: Zoom Controls */}
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
              transition:
                isPanning || isDrawingRef.current || isDraggingShapeRef.current
                  ? "none"
                  : "transform 0.12s ease-out",
              visibility: isLoadingImage || !fitDimensions ? "hidden" : "visible",
            }}
            className="relative inline-block overflow-hidden rounded border border-neutral-800 shadow-2xl [background-image:linear-gradient(45deg,#1c1917_25%,transparent_25%),linear-gradient(-45deg,#1c1917_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1c1917_75%),linear-gradient(-45deg,transparent_75%,#1c1917_75%)] [background-size:16px_16px] [background-position:0_0,0_8px,8px_-8px,-8px_0] bg-neutral-900"
          >
            <canvas
              ref={canvasRef}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerCancel={handleCanvasPointerCancel}
              style={{
                width: fitDimensions ? `${fitDimensions.width}px` : "auto",
                height: fitDimensions ? `${fitDimensions.height}px` : "auto",
              }}
              className={`block touch-none select-none ${
                isPanActive ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-crosshair"
              }`}
            />

            {/* Live SVG Vector Overlay for Shape Previews */}
            {naturalSize.width > 0 && naturalSize.height > 0 && (
              <svg
                viewBox={`0 0 ${naturalSize.width} ${naturalSize.height}`}
                className="absolute inset-0 pointer-events-none w-full h-full z-10 overflow-visible"
              >
                {/* 1. Rectangle / Square Drag Preview */}
                {shapeDrag &&
                  activeTool === "rectangle" &&
                  (() => {
                    const rect = computeDragRect(
                      shapeDrag.start,
                      shapeDrag.current,
                      shapeDrag.isShift || lockSquare,
                      naturalSize
                    );
                    return (
                      <g>
                        <rect
                          x={rect.x}
                          y={rect.y}
                          width={rect.w}
                          height={rect.h}
                          fill="rgba(239, 68, 68, 0.28)"
                          stroke="#ef4444"
                          strokeWidth={svgStrokeWidth}
                          strokeDasharray={svgDashArray}
                        />
                        <circle
                          cx={rect.x}
                          cy={rect.y}
                          r={svgHandleRadius}
                          fill="#ffffff"
                          stroke="#ef4444"
                          strokeWidth={svgStrokeWidth}
                        />
                        <circle
                          cx={rect.x + rect.w}
                          cy={rect.y}
                          r={svgHandleRadius}
                          fill="#ffffff"
                          stroke="#ef4444"
                          strokeWidth={svgStrokeWidth}
                        />
                        <circle
                          cx={rect.x}
                          cy={rect.y + rect.h}
                          r={svgHandleRadius}
                          fill="#ffffff"
                          stroke="#ef4444"
                          strokeWidth={svgStrokeWidth}
                        />
                        <circle
                          cx={rect.x + rect.w}
                          cy={rect.y + rect.h}
                          r={svgHandleRadius}
                          fill="#ffffff"
                          stroke="#ef4444"
                          strokeWidth={svgStrokeWidth}
                        />
                      </g>
                    );
                  })()}

                {/* 2. Triangle Drag Box Preview */}
                {shapeDrag &&
                  activeTool === "triangle" &&
                  triangleMode === "drag" &&
                  (() => {
                    const tri = computeDragTriangle(
                      shapeDrag.start,
                      shapeDrag.current,
                      shapeDrag.isShift,
                      triangleOrientation,
                      naturalSize
                    );
                    return (
                      <g>
                        <polygon
                          points={`${tri.p1.x},${tri.p1.y} ${tri.p2.x},${tri.p2.y} ${tri.p3.x},${tri.p3.y}`}
                          fill="rgba(239, 68, 68, 0.28)"
                          stroke="#ef4444"
                          strokeWidth={svgStrokeWidth}
                          strokeDasharray={svgDashArray}
                        />
                        <circle
                          cx={tri.p1.x}
                          cy={tri.p1.y}
                          r={svgHandleRadius}
                          fill="#ffffff"
                          stroke="#ef4444"
                          strokeWidth={svgStrokeWidth}
                        />
                        <circle
                          cx={tri.p2.x}
                          cy={tri.p2.y}
                          r={svgHandleRadius}
                          fill="#ffffff"
                          stroke="#ef4444"
                          strokeWidth={svgStrokeWidth}
                        />
                        <circle
                          cx={tri.p3.x}
                          cy={tri.p3.y}
                          r={svgHandleRadius}
                          fill="#ffffff"
                          stroke="#ef4444"
                          strokeWidth={svgStrokeWidth}
                        />
                      </g>
                    );
                  })()}

                {/* 3. Triangle 3-Point Mode Preview */}
                {activeTool === "triangle" &&
                  triangleMode === "threePoint" &&
                  (() => {
                    if (threePoints.length === 1 && hoverPoint) {
                      const p1 = threePoints[0];
                      const p2 = hoverPoint;
                      return (
                        <g>
                          <line
                            x1={p1.x}
                            y1={p1.y}
                            x2={p2.x}
                            y2={p2.y}
                            stroke="#ef4444"
                            strokeWidth={svgStrokeWidth}
                            strokeDasharray={svgDashArray}
                          />
                          <circle
                            cx={p1.x}
                            cy={p1.y}
                            r={svgHandleRadius * 1.3}
                            fill="#ef4444"
                            stroke="#ffffff"
                            strokeWidth={svgStrokeWidth}
                          />
                          <circle
                            cx={p2.x}
                            cy={p2.y}
                            r={svgHandleRadius}
                            fill="#ef4444"
                            opacity="0.7"
                          />
                        </g>
                      );
                    }

                    if (threePoints.length === 2 && hoverPoint) {
                      const p1 = threePoints[0];
                      const p2 = threePoints[1];
                      const p3 = hoverPoint;
                      return (
                        <g>
                          <polygon
                            points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
                            fill="rgba(239, 68, 68, 0.28)"
                            stroke="#ef4444"
                            strokeWidth={svgStrokeWidth}
                            strokeDasharray={svgDashArray}
                          />
                          <circle
                            cx={p1.x}
                            cy={p1.y}
                            r={svgHandleRadius * 1.3}
                            fill="#ef4444"
                            stroke="#ffffff"
                            strokeWidth={svgStrokeWidth}
                          />
                          <circle
                            cx={p2.x}
                            cy={p2.y}
                            r={svgHandleRadius * 1.3}
                            fill="#ef4444"
                            stroke="#ffffff"
                            strokeWidth={svgStrokeWidth}
                          />
                          <circle
                            cx={p3.x}
                            cy={p3.y}
                            r={svgHandleRadius}
                            fill="#ef4444"
                            opacity="0.7"
                          />
                        </g>
                      );
                    }

                    if (threePoints.length > 0 && !hoverPoint) {
                      return (
                        <g>
                          {threePoints.map((pt, idx) => (
                            <circle
                              key={idx}
                              cx={pt.x}
                              cy={pt.y}
                              r={svgHandleRadius * 1.3}
                              fill="#ef4444"
                              stroke="#ffffff"
                              strokeWidth={svgStrokeWidth}
                            />
                          ))}
                          {threePoints.length === 2 && (
                            <line
                              x1={threePoints[0].x}
                              y1={threePoints[0].y}
                              x2={threePoints[1].x}
                              y2={threePoints[1].y}
                              stroke="#ef4444"
                              strokeWidth={svgStrokeWidth}
                              strokeDasharray={svgDashArray}
                            />
                          )}
                        </g>
                      );
                    }

                    return null;
                  })()}
              </svg>
            )}
          </div>

          {/* Floating Brush Ring Cursor (only for freehand brush tool) */}
          {cursorPos && !isLoadingImage && !isPanActive && activeTool === "eraser" && (
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

          {/* Interactive Floating Status & Dimension Pill */}
          {!isLoadingImage && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/90 border border-primary/30 backdrop-blur-md shadow-xl text-xs text-neutral-200">
              {activeTool === "eraser" && (
                <span className="flex items-center gap-1.5">
                  <Eraser className="h-3 w-3 text-primary" />
                  Brush erase • Size: <strong className="text-primary">{brushSize}px</strong>
                </span>
              )}

              {activeTool === "rectangle" && (
                <span className="flex items-center gap-1.5">
                  <Square className="h-3 w-3 text-primary" />
                  {shapeDrag ? (
                    (() => {
                      const r = computeDragRect(
                        shapeDrag.start,
                        shapeDrag.current,
                        shapeDrag.isShift || lockSquare,
                        naturalSize
                      );
                      return (
                        <span>
                          <strong className="text-primary font-mono">
                            {Math.round(r.w)} × {Math.round(r.h)} px
                          </strong>{" "}
                          {shapeDrag.isShift || lockSquare ? "(Square 1:1)" : "(Rectangle)"}
                        </span>
                      );
                    })()
                  ) : (
                    <span>
                      Click & drag to erase {lockSquare ? "square" : "rectangle"} (Hold Shift for
                      1:1)
                    </span>
                  )}
                </span>
              )}

              {activeTool === "triangle" && triangleMode === "drag" && (
                <span className="flex items-center gap-1.5">
                  <Triangle className="h-3 w-3 text-primary" />
                  {shapeDrag ? (
                    (() => {
                      const t = computeDragTriangle(
                        shapeDrag.start,
                        shapeDrag.current,
                        shapeDrag.isShift,
                        triangleOrientation,
                        naturalSize
                      );
                      return (
                        <span>
                          Base:{" "}
                          <strong className="text-primary font-mono">{Math.round(t.w)}px</strong> •
                          Height:{" "}
                          <strong className="text-primary font-mono">{Math.round(t.h)}px</strong>
                        </span>
                      );
                    })()
                  ) : (
                    <span>Click & drag to erase triangle (Hold Shift for equilateral)</span>
                  )}
                </span>
              )}

              {activeTool === "triangle" && triangleMode === "threePoint" && (
                <span className="flex items-center gap-1.5">
                  <MousePointerClick className="h-3 w-3 text-primary" />
                  {threePoints.length === 0 && "Click 1st corner of triangle"}
                  {threePoints.length === 1 && "Corner 1 placed • Click 2nd corner (Esc to cancel)"}
                  {threePoints.length === 2 && (
                    <span className="text-primary font-semibold">
                      Click 3rd corner to erase triangle (Esc to cancel)
                    </span>
                  )}
                </span>
              )}

              {activeTool === "pan" && (
                <span className="flex items-center gap-1.5">
                  <Hand className="h-3 w-3 text-primary" />
                  Click & drag workspace to pan
                </span>
              )}
            </div>
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
                <TooltipContent side="top">Undo last stroke or shape (Ctrl+Z)</TooltipContent>
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
                <TooltipContent side="top">Revert all eraser edits</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Keyboard shortcut tips */}
            <span className="hidden xl:inline-flex items-center gap-2 ml-4 text-[11px] text-neutral-400">
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono text-[10px]">
                  E
                </kbd>{" "}
                Brush
              </span>
              <span>•</span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono text-[10px]">
                  R
                </kbd>{" "}
                Square
              </span>
              <span>•</span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono text-[10px]">
                  T
                </kbd>{" "}
                Triangle
              </span>
              <span>•</span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono text-[10px]">
                  Space
                </kbd>{" "}
                Pan
              </span>
              <span>•</span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono text-[10px]">
                  Esc
                </kbd>{" "}
                Cancel
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
