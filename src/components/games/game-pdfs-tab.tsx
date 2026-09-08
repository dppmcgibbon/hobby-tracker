"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  Upload,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  AlertCircle,
  FileCheck2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ImagePlus,
  LayoutList,
  LayoutGrid,
  Folder,
  FolderPlus,
  FolderArchive,
  Layers,
  MoreHorizontal,
  Pencil,
  X,
  BookOpen,
} from "lucide-react";
import {
  getGamePdfUploadUrl,
  getGamePdfCoverUploadUrl,
  saveGamePdf,
  savePdfCoverImage,
  saveGameCover,
  uploadGamePdfServerSide,
  deleteGameLink,
  reorderGamePdfs,
  updateGamePdfCategory,
  addGamePdfCategory,
  renameGamePdfCategory,
  deleteGamePdfCategory,
  updateGamePdfTitle,
  type GameEntityType,
} from "@/app/actions/games";
import {
  type GameInfoLink,
  isGamePdfLink,
  sortGamePdfLinks,
  isGameRulesPdfLink,
  getFirstRulesPdf,
} from "@/lib/games/game-details";
import { getR2PublicUrl } from "@/lib/r2";
import { renderPdfFirstPageToBlob } from "@/lib/utils/pdf-thumbnail";

interface GamePdfsTabProps {
  entityType: GameEntityType;
  entityId: string;
  links: GameInfoLink[];
  gameTitle?: string;
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function GamePdfsTab({ entityType, entityId, links, gameTitle = "Game" }: GamePdfsTabProps) {
  const router = useRouter();

  // Local state for sorted PDFs
  const [pdfItems, setPdfItems] = useState<GameInfoLink[]>(() =>
    sortGamePdfLinks(links.filter(isGamePdfLink))
  );

  // View mode state (list view default)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Sync with prop updates
  useEffect(() => {
    setPdfItems(sortGamePdfLinks(links.filter(isGamePdfLink)));
  }, [links]);

  // Extract custom categories from PDF_CATEGORIES_CATALOG entry
  const catalogEntry = links.find(
    (l) => (l.category as string)?.toUpperCase() === "PDF_CATEGORIES_CATALOG"
  );
  const catalogCategories: string[] = useMemo(() => {
    if (Array.isArray(catalogEntry?.pdf_categories)) return catalogEntry.pdf_categories;
    return [];
  }, [catalogEntry]);

  // Extract distinct categories from all PDFs (defaulting missing category to "Rules")
  const itemCategories = useMemo(() => {
    return Array.from(
      new Set(pdfItems.map((p) => (p.pdf_category && p.pdf_category.trim()) || "Rules"))
    );
  }, [pdfItems]);

  // Consolidated unique list of all categories: uses catalog if set, otherwise defaults to "Rules", "Reference"
  const allCategories = useMemo(() => {
    const baseList = Array.isArray(catalogEntry?.pdf_categories)
      ? catalogEntry.pdf_categories.filter((c): c is string => Boolean(c && c.trim()))
      : ["Rules", "Reference"];
    const set = new Set<string>(baseList);
    for (const c of itemCategories) {
      if (c && c.trim()) set.add(c.trim());
    }
    if (set.size === 0) set.add("Rules");
    return Array.from(set);
  }, [catalogEntry, itemCategories]);

  // Active category tab: default "Rules"
  const [activeCategory, setActiveCategory] = useState<string>("Rules");

  // Filtered PDFs for currently active category
  const displayedPdfs = useMemo(() => {
    if (activeCategory === "ALL") return pdfItems;
    return pdfItems.filter(
      (p) =>
        ((p.pdf_category && p.pdf_category.trim()) || "Rules").toLowerCase() ===
        activeCategory.toLowerCase()
    );
  }, [pdfItems, activeCategory]);

  // The first PDF in the "Rules" category is strictly defined as the edition/game cover
  const firstRulesPdf = useMemo(() => getFirstRulesPdf(pdfItems), [pdfItems]);
  const firstRulesPdfId = firstRulesPdf?.id || null;

  // Count helper
  const getCategoryCount = useCallback(
    (categoryName: string) => {
      if (categoryName === "ALL") return pdfItems.length;
      return pdfItems.filter(
        (p) =>
          ((p.pdf_category && p.pdf_category.trim()) || "Rules").toLowerCase() ===
          categoryName.toLowerCase()
      ).length;
    },
    [pdfItems]
  );

  // Drag and drop state for reordering & moving categories
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedPdfId, setDraggedPdfId] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [isMovingPdf, setIsMovingPdf] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // New Category Dialog State
  const [newCategoryDialogOpen, setNewCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Rename & Delete Category State
  const [categoryToRename, setCategoryToRename] = useState<string | null>(null);
  const [renameCategoryInput, setRenameCategoryInput] = useState<string>("");
  const [isRenamingCategory, setIsRenamingCategory] = useState<boolean>(false);
  const [categoryToDeleteCustom, setCategoryToDeleteCustom] = useState<string | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState<boolean>(false);

  // Inline Document Title Edit State
  const [editingPdfId, setEditingPdfId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");

  // State for upload dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<string>("Rules");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // State for deletion & preview
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewPdfId, setPreviewPdfId] = useState<string | null>(null);
  const [generatingCoverId, setGeneratingCoverId] = useState<string | null>(null);

  const handleMovePdf = async (pdfId: string, targetCategory: string) => {
    const targetPdf = pdfItems.find((p) => p.id === pdfId);
    if (!targetPdf) return;
    const currentCat = (targetPdf.pdf_category && targetPdf.pdf_category.trim()) || "Rules";
    if (currentCat.toLowerCase() === targetCategory.toLowerCase()) return;

    setIsMovingPdf(true);
    try {
      await updateGamePdfCategory(entityType, entityId, pdfId, targetCategory);
      toast.success(`Moved document to "${targetCategory}"`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to move PDF";
      toast.error(msg);
    } finally {
      setIsMovingPdf(false);
      setDragOverCategory(null);
      setDraggedPdfId(null);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (allCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`Category "${trimmed}" already exists.`);
      return;
    }

    setIsCreatingCategory(true);
    try {
      await addGamePdfCategory(entityType, entityId, trimmed);
      toast.success(`Category "${trimmed}" created!`);
      setActiveCategory(trimmed);
      setNewCategoryName("");
      setNewCategoryDialogOpen(false);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create category";
      toast.error(msg);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleOpenRenameCategory = (categoryName: string) => {
    setCategoryToRename(categoryName);
    setRenameCategoryInput(categoryName);
  };

  const handleConfirmRenameCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryToRename) return;
    const trimmed = renameCategoryInput.trim();
    if (!trimmed) {
      toast.error("Category name cannot be empty");
      return;
    }
    if (trimmed.toLowerCase() === categoryToRename.toLowerCase()) {
      setCategoryToRename(null);
      return;
    }
    setIsRenamingCategory(true);
    try {
      await renameGamePdfCategory(entityType, entityId, categoryToRename, trimmed);
      toast.success(`Renamed category to "${trimmed}"`);
      if (activeCategory.toLowerCase() === categoryToRename.toLowerCase()) {
        setActiveCategory(trimmed);
      }
      setCategoryToRename(null);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to rename category";
      toast.error(msg);
    } finally {
      setIsRenamingCategory(false);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDeleteCustom) return;
    setIsDeletingCategory(true);
    try {
      const res = await deleteGamePdfCategory(entityType, entityId, categoryToDeleteCustom);
      toast.success(`Deleted category "${categoryToDeleteCustom}"`);
      if (activeCategory.toLowerCase() === categoryToDeleteCustom.toLowerCase()) {
        setActiveCategory(res.fallbackCategory || "Rules");
      }
      setCategoryToDeleteCustom(null);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete category";
      toast.error(msg);
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const handleStartEditTitle = (pdf: GameInfoLink) => {
    setEditingPdfId(pdf.id);
    setEditingTitle(pdf.title);
  };

  const handleSaveTitle = async (pdfId: string) => {
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      toast.error("Document title cannot be empty");
      return;
    }

    const currentItem = pdfItems.find((p) => p.id === pdfId);
    if (currentItem && currentItem.title === trimmed) {
      setEditingPdfId(null);
      return;
    }

    // Optimistic update
    setPdfItems((prev) =>
      prev.map((p) => (p.id === pdfId ? { ...p, title: trimmed } : p))
    );
    setEditingPdfId(null);

    try {
      await updateGamePdfTitle(entityType, entityId, pdfId, trimmed);
      toast.success("Document title updated");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update title";
      toast.error(msg);
      // Revert optimistic update
      if (currentItem) {
        setPdfItems((prev) =>
          prev.map((p) => (p.id === pdfId ? { ...p, title: currentItem.title } : p))
        );
      }
    }
  };

  const handleCancelEditTitle = () => {
    setEditingPdfId(null);
    setEditingTitle("");
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      setError(null);

      // Auto-populate title as the last word before .pdf (hyphen-separated)
      const nameWithoutExt = file.name.replace(/\.pdf$/i, "").trim();
      const segments = nameWithoutExt
        .split(/[-_]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const lastWord = segments[segments.length - 1] || nameWithoutExt;
      const formattedTitle = lastWord ? lastWord.charAt(0).toUpperCase() + lastWord.slice(1) : "";
      setPdfTitle(formattedTitle);
    }
  }, []);

  const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      const rej = fileRejections[0];
      if (rej.errors.some((e) => e.code === "file-too-large")) {
        setError("File is too large. Maximum size is 250MB.");
      } else {
        setError("Please select a valid PDF file.");
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    maxSize: 250 * 1024 * 1024, // 250MB
  });

  const handleOpenDialog = (open: boolean) => {
    if (open) {
      setSelectedFile(null);
      setPdfTitle("");
      setDescription("");
      setError(null);
      setUploadProgress(null);
      setUploadCategory(activeCategory === "ALL" ? "Rules" : activeCategory);
    }
    setDialogOpen(open);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select a PDF file to upload.");
      return;
    }
    if (!pdfTitle.trim()) {
      setError("Please enter a title for this PDF document.");
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress("Extracting cover image from PDF...");

    try {
      // 1. Generate cover image blob from page 1 locally in the browser
      let coverBlob: Blob | null = null;
      try {
        coverBlob = await renderPdfFirstPageToBlob(selectedFile, {
          scale: 1.5,
          format: "image/webp",
          quality: 0.9,
        });
      } catch (thumbErr) {
        console.warn("Failed to generate local PDF cover image:", thumbErr);
      }

      let uploadedToR2 = false;
      let r2Key = "";
      let coverImageKey: string | null = null;

      // 2. Direct upload to Cloudflare R2
      try {
        setUploadProgress("Preparing secure direct upload...");
        const [presignedPdf, presignedCover] = await Promise.all([
          getGamePdfUploadUrl(
            entityType,
            entityId,
            selectedFile.name,
            selectedFile.type || "application/pdf"
          ),
          coverBlob
            ? getGamePdfCoverUploadUrl(
                entityType,
                entityId,
                selectedFile.name,
                coverBlob.type || "image/webp"
              )
            : Promise.resolve(null),
        ]);

        // Upload cover thumbnail to R2 if generated
        if (presignedCover && coverBlob) {
          try {
            setUploadProgress("Uploading cover image...");
            const coverRes = await fetch(presignedCover.presignedUrl, {
              method: "PUT",
              body: coverBlob,
              headers: { "Content-Type": coverBlob.type || "image/webp" },
            });
            if (coverRes.ok) {
              coverImageKey = presignedCover.key;
            }
          } catch (coverUploadErr) {
            console.warn("Failed to upload direct cover image:", coverUploadErr);
          }
        }

        setUploadProgress("Uploading PDF (0%)...");
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", presignedPdf.presignedUrl);
          xhr.setRequestHeader("Content-Type", selectedFile.type || "application/pdf");
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const pct = Math.round((event.loaded / event.total) * 100);
              const loadedMb = (event.loaded / (1024 * 1024)).toFixed(1);
              const totalMb = (event.total / (1024 * 1024)).toFixed(1);
              setUploadProgress(`Uploading PDF: ${loadedMb} MB / ${totalMb} MB (${pct}%)...`);
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Direct upload failed (HTTP ${xhr.status})`));
            }
          };
          xhr.onerror = () => reject(new Error("Direct upload network error"));
          xhr.onabort = () => reject(new Error("Upload aborted"));
          xhr.send(selectedFile);
        });

        r2Key = presignedPdf.key;
        uploadedToR2 = true;
      } catch (directErr) {
        console.warn("Direct R2 presigned upload failed, trying server fallback:", directErr);
      }

      // 3. Fallback to server-side action if direct PUT failed
      if (uploadedToR2 && r2Key) {
        setUploadProgress("Saving PDF record...");
        await saveGamePdf(entityType, entityId, {
          title: pdfTitle.trim(),
          r2Key,
          fileSize: selectedFile.size,
          description: description.trim() || null,
          coverImageKey,
          pdfCategory: uploadCategory,
        });
      } else {
        setUploadProgress("Uploading via server fallback...");
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("title", pdfTitle.trim());
        formData.append("pdf_category", uploadCategory);
        if (description.trim()) {
          formData.append("description", description.trim());
        }
        if (coverBlob) {
          formData.append("coverFile", coverBlob, "cover.webp");
        }
        await uploadGamePdfServerSide(entityType, entityId, formData);
      }

      toast.success("PDF uploaded successfully with cover image!");
      if (activeCategory !== "ALL" && activeCategory.toLowerCase() !== uploadCategory.toLowerCase()) {
        setActiveCategory(uploadCategory);
      }
      setDialogOpen(false);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload PDF";
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  // Generate cover on-demand for existing PDFs that don't have one
  const handleGenerateCover = async (e: React.MouseEvent, pdf: GameInfoLink) => {
    e.preventDefault();
    e.stopPropagation();

    setGeneratingCoverId(pdf.id);
    try {
      toast.info("Extracting cover image from PDF...");
      const blob = await renderPdfFirstPageToBlob(pdf.url, {
        scale: 1.5,
        format: "image/webp",
        quality: 0.9,
      });

      const presigned = await getGamePdfCoverUploadUrl(
        entityType,
        entityId,
        pdf.title || "document",
        blob.type || "image/webp"
      );

      const uploadRes = await fetch(presigned.presignedUrl, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": blob.type || "image/webp" },
      });

      if (!uploadRes.ok) {
        throw new Error(`Failed to upload cover to storage (HTTP ${uploadRes.status})`);
      }

      await savePdfCoverImage(entityType, entityId, pdf.id, presigned.key);

      // If this PDF is the first in the Rules category, also sync it immediately as the entity cover
      if (pdf.id === firstRulesPdfId) {
        try {
          await saveGameCover(entityType, entityId, presigned.key);
        } catch (syncErr) {
          console.warn("Failed to sync game cover on entity:", syncErr);
        }
      }

      toast.success("Cover image generated and saved!");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate cover image";
      toast.error(msg);
    } finally {
      setGeneratingCoverId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, linkId: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    setDeletingId(linkId);
    try {
      await deleteGameLink(entityType, entityId, linkId);
      if (previewPdfId === linkId) {
        setPreviewPdfId(null);
      }
      toast.success("PDF removed successfully");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete PDF";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const togglePreview = (id: string) => {
    setPreviewPdfId((curr) => (curr === id ? null : id));
  };

  // Reorder persistence
  const persistOrder = async (orderedList: GameInfoLink[]) => {
    setIsSavingOrder(true);
    try {
      const orderedIds = orderedList.map((p) => p.id);
      await reorderGamePdfs(entityType, entityId, orderedIds);
      toast.success("Document order updated");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update order";
      toast.error(msg);
      // Revert to original
      setPdfItems(sortGamePdfLinks(links.filter(isGamePdfLink)));
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Set a Rules PDF directly as the edition cover (moving it to position #1 in Rules)
  const handleSetAsCover = async (pdf: GameInfoLink) => {
    if (!isGameRulesPdfLink(pdf)) {
      toast.error("Only PDFs in the Rules category can be set as the cover.");
      return;
    }

    if (pdf.id === firstRulesPdfId) {
      toast.info(`"${pdf.title}" is already the edition cover.`);
      return;
    }

    // Partition into Rules PDFs and non-Rules PDFs to preserve Rules-first grouping
    const rulesPdfs = pdfItems.filter(isGameRulesPdfLink);
    const nonRulesPdfs = pdfItems.filter((p) => !isGameRulesPdfLink(p));

    // Place target PDF at index 0 of Rules
    const reorderedRules = [pdf, ...rulesPdfs.filter((p) => p.id !== pdf.id)];
    const fullList = [...reorderedRules, ...nonRulesPdfs];

    const withNewPositions = fullList.map((item, idx) => ({
      ...item,
      position: idx + 1,
    }));

    setPdfItems(withNewPositions);

    try {
      await persistOrder(withNewPositions);

      // If this PDF already has a precomputed cover, sync it to the entity record
      if (pdf.cover_image) {
        await saveGameCover(entityType, entityId, pdf.cover_image);
      }

      toast.success(`Set "${pdf.title}" as the edition cover.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to set document as cover";
      toast.error(msg);
    }
  };

  // Drag and drop event handlers
  const handleDragStart = (e: React.DragEvent, index: number, pdfId?: string) => {
    if ((e.target as HTMLElement).closest("button, a, input")) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    if (pdfId) setDraggedPdfId(pdfId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${index}`);
    if (pdfId) e.dataTransfer.setData("application/x-pdf-id", pdfId);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDraggedPdfId(null);
    setDragOverCategory(null);
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const movedItem = displayedPdfs[draggedIndex];
    const targetItem = displayedPdfs[targetIndex];
    if (!movedItem || !targetItem) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...pdfItems];
    const oldIndex = updated.findIndex((p) => p.id === movedItem.id);
    const newTargetIndex = updated.findIndex((p) => p.id === targetItem.id);
    if (oldIndex < 0 || newTargetIndex < 0) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const [moved] = updated.splice(oldIndex, 1);
    updated.splice(newTargetIndex, 0, moved);

    // Make sure Rules category PDFs always stay grouped first
    const rulesGroup = updated.filter(isGameRulesPdfLink);
    const nonRulesGroup = updated.filter((p) => !isGameRulesPdfLink(p));
    const grouped = [...rulesGroup, ...nonRulesGroup];

    const withNewPositions = grouped.map((item, idx) => ({
      ...item,
      position: idx + 1,
    }));

    setPdfItems(withNewPositions);
    setDraggedIndex(null);
    setDragOverIndex(null);

    await persistOrder(withNewPositions);
  };

  // Move Up / Down button handlers
  const handleMove = async (displayedIndex: number, direction: "up" | "down") => {
    const targetDisplayedIndex = direction === "up" ? displayedIndex - 1 : displayedIndex + 1;
    if (targetDisplayedIndex < 0 || targetDisplayedIndex >= displayedPdfs.length) return;

    const currentItem = displayedPdfs[displayedIndex];
    const targetItem = displayedPdfs[targetDisplayedIndex];
    if (!currentItem || !targetItem) return;

    const updated = [...pdfItems];
    const oldIndex = updated.findIndex((p) => p.id === currentItem.id);
    const newTargetIndex = updated.findIndex((p) => p.id === targetItem.id);
    if (oldIndex < 0 || newTargetIndex < 0) return;

    const [moved] = updated.splice(oldIndex, 1);
    updated.splice(newTargetIndex, 0, moved);

    // Keep Rules category PDFs grouped at the beginning
    const rulesGroup = updated.filter(isGameRulesPdfLink);
    const nonRulesGroup = updated.filter((p) => !isGameRulesPdfLink(p));
    const grouped = [...rulesGroup, ...nonRulesGroup];

    const withNewPositions = grouped.map((item, idx) => ({
      ...item,
      position: idx + 1,
    }));

    setPdfItems(withNewPositions);
    await persistOrder(withNewPositions);
  };

  const activePreviewPdf = pdfItems.find((p) => p.id === previewPdfId);

  return (
    <Card className="warhammer-card border-primary/30">
      <CardHeader className="pb-3 border-b border-primary/15 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg font-black uppercase tracking-wider text-primary flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            PDF Documents & Rules
            {isSavingOrder && (
              <span className="flex items-center gap-1 text-xs text-primary/80 normal-case font-normal ml-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                saving order...
              </span>
            )}
          </CardTitle>
          <CardDescription className="text-xs uppercase tracking-wide mt-1">
            Rulebooks, reference guides, and supplements • Drag rows or use arrows to reorder
          </CardDescription>
        </div>

        <div className="flex items-center gap-2.5">
          {/* List vs Grid View Toggle */}
          {pdfItems.length > 0 && (
            <div className="flex items-center bg-black/60 border border-primary/30 rounded p-0.5 shadow-sm">
              <Button
                type="button"
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={`h-7 w-7 p-0 rounded-sm ${
                  viewMode === "list"
                    ? "bg-primary text-black hover:bg-primary/90 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="List View"
                aria-label="List View"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={`h-7 w-7 p-0 rounded-sm ${
                  viewMode === "grid"
                    ? "bg-primary text-black hover:bg-primary/90 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Grid View"
                aria-label="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Dialog open={dialogOpen} onOpenChange={handleOpenDialog}>
            <DialogTrigger asChild>
              <Button
                className="btn-warhammer-primary h-8 w-8 p-0"
                size="sm"
                title="Upload PDF"
                aria-label="Upload PDF"
              >
                <Upload className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg bg-card border-primary/30">
              <DialogHeader>
                <DialogTitle className="text-lg font-black uppercase tracking-wider text-primary flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Upload PDF Document
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleUpload} className="space-y-4 pt-2">
                {/* Dropzone */}
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? "border-primary bg-primary/10"
                      : selectedFile
                        ? "border-primary/50 bg-primary/5"
                        : "border-primary/30 hover:border-primary/60 hover:bg-muted/30"
                  }`}
                >
                  <input {...getInputProps()} />
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2 text-primary">
                      <FileCheck2 className="h-10 w-10 text-primary" />
                      <p className="text-sm font-bold text-foreground break-all">
                        {selectedFile.name}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatBytes(selectedFile.size)} • Click or drop to replace
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload className="h-10 w-10 text-primary/70" />
                      <p className="text-sm font-bold text-foreground">
                        Click to choose or drag & drop a PDF
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Official rulebooks, errata, battle packs (up to 250MB)
                      </p>
                    </div>
                  )}
                </div>

                {/* Title Input */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="pdf-title"
                    className="text-xs font-bold uppercase tracking-wide text-foreground/90"
                  >
                    Document Title <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="pdf-title"
                    placeholder="e.g. Core Rulebook, Battle Pack, Reference Sheet"
                    value={pdfTitle}
                    onChange={(e) => setPdfTitle(e.target.value)}
                    className="bg-background border-primary/30 text-sm focus-visible:border-primary"
                    required
                  />
                </div>

                {/* Category Selection */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="upload-category-select"
                    className="text-xs font-bold uppercase tracking-wide text-foreground/90 flex items-center justify-between"
                  >
                    <span>Category</span>
                    <span className="text-[10px] text-primary font-normal">
                      Default: Rules
                    </span>
                  </Label>
                  <Select value={uploadCategory} onValueChange={setUploadCategory}>
                    <SelectTrigger id="upload-category-select" className="bg-background border-primary/30 text-xs">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-primary/30">
                      {allCategories.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Optional Description */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="pdf-desc"
                    className="text-xs font-bold uppercase tracking-wide text-foreground/90"
                  >
                    Description{" "}
                    <span className="text-muted-foreground text-[10px] normal-case">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="pdf-desc"
                    placeholder="e.g. Official 1989 edition core rulebook with intro mission"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-background border-primary/30 text-sm focus-visible:border-primary"
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded p-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Upload Progress Status */}
                {uploadProgress && (
                  <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 border border-primary/30 rounded p-2.5">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0 text-primary" />
                    <span>{uploadProgress}</span>
                  </div>
                )}

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={uploading}
                    className="text-xs font-bold uppercase tracking-wider"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={uploading || !selectedFile || !pdfTitle.trim()}
                    className="btn-warhammer-primary text-xs font-bold uppercase tracking-wider"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        Upload PDF
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="pt-2.5 space-y-4">
        {/* Categories Bar - Lightweight Pill Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/15 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {allCategories.map((cat) => {
              const count = getCategoryCount(cat);
              const isActive = activeCategory.toLowerCase() === cat.toLowerCase();
              const isDragOver = dragOverCategory?.toLowerCase() === cat.toLowerCase();
              const isCustom =
                cat.toLowerCase() !== "rules" && cat.toLowerCase() !== "reference";

              return (
                <div
                  key={cat}
                  className="relative group/category inline-flex items-center"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverCategory !== cat) setDragOverCategory(cat);
                  }}
                  onDragLeave={() => {
                    if (dragOverCategory === cat) setDragOverCategory(null);
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const pdfId = e.dataTransfer.getData("application/x-pdf-id") || draggedPdfId;
                    setDragOverCategory(null);
                    setDraggedPdfId(null);
                    setDraggedIndex(null);
                    if (pdfId) {
                      await handleMovePdf(pdfId, cat);
                    }
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all",
                      isActive
                        ? "bg-primary/20 text-primary border border-primary/40 font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent",
                      isDragOver &&
                        "bg-primary/30 border-primary text-primary ring-2 ring-primary/60 scale-105"
                    )}
                  >
                    <Folder className={cn("h-3 w-3", isActive ? "text-primary" : "text-muted-foreground/60")} />
                    <span>{cat}</span>
                    <span
                      className={cn(
                        "text-[10px] tabular-nums font-mono",
                        isActive ? "text-primary/90 font-bold" : "text-muted-foreground/50"
                      )}
                    >
                      {count}
                    </span>

                    {/* Subtle options menu trigger for Rename and Delete */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <span
                          role="button"
                          title={`Category options for "${cat}"`}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "p-0.5 rounded-full transition-all ml-0.5 text-muted-foreground hover:text-primary hover:bg-primary/20",
                            isActive
                              ? "opacity-80 hover:opacity-100"
                              : "opacity-0 group-hover/category:opacity-70 hover:!opacity-100"
                          )}
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-card border-primary/30 min-w-36 z-50">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenRenameCategory(cat);
                          }}
                          className="text-xs cursor-pointer flex items-center gap-2"
                        >
                          <Pencil className="h-3 w-3" />
                          <span>Rename</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={allCategories.length <= 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCategoryToDeleteCustom(cat);
                          }}
                          className="text-xs cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </button>
                </div>
              );
            })}

            {/* "All" pill */}
            <button
              type="button"
              onClick={() => setActiveCategory("ALL")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all",
                activeCategory === "ALL"
                  ? "bg-primary/20 text-primary border border-primary/40 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
              )}
            >
              <Layers className={cn("h-3 w-3", activeCategory === "ALL" ? "text-primary" : "text-muted-foreground/60")} />
              <span>All</span>
              <span
                className={cn(
                  "text-[10px] tabular-nums font-mono",
                  activeCategory === "ALL" ? "text-primary/90 font-bold" : "text-muted-foreground/50"
                )}
              >
                {pdfItems.length}
              </span>
            </button>
          </div>

          {/* New Category Trigger - Lightweight ghost chip */}
          <Dialog open={newCategoryDialogOpen} onOpenChange={setNewCategoryDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors border border-dashed border-primary/30"
              >
                <FolderPlus className="h-3 w-3" />
                <span>New Category</span>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xs bg-card border-primary/30">
              <DialogHeader>
                <DialogTitle className="text-base font-black uppercase tracking-wider text-primary flex items-center gap-2">
                  <FolderPlus className="h-4 w-4 text-primary" />
                  New Category
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Create a custom PDF category for {gameTitle}.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateCategory} className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="pdf-category-name" className="text-xs font-bold uppercase tracking-wider">
                    Category Name
                  </Label>
                  <Input
                    id="pdf-category-name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g. Campaign, Errata, Scenarios"
                    autoFocus
                    maxLength={30}
                    className="h-8 text-xs bg-neutral-900 border-primary/30"
                  />
                </div>
                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewCategoryDialogOpen(false)}
                    disabled={isCreatingCategory}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newCategoryName.trim() || isCreatingCategory}
                    className="btn-warhammer-primary text-xs font-bold uppercase tracking-wider"
                  >
                    {isCreatingCategory ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Creating...
                      </>
                    ) : (
                      "Create"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {pdfItems.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-primary/20 rounded-sm bg-black/20">
            <div className="inline-flex p-3 rounded-full bg-primary/10 border border-primary/30 mb-3">
              <FileText className="h-8 w-8 text-primary/70" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              No PDFs uploaded yet
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Upload rulebooks, scenarios, or reference PDFs for {gameTitle} for quick, direct
              access anytime.
            </p>
            <Button
              onClick={() => handleOpenDialog(true)}
              variant="outline"
              size="sm"
              className="mt-4 border-primary/40 hover:border-primary hover:bg-primary/10 text-xs font-bold uppercase tracking-wider text-primary"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Upload First PDF
            </Button>
          </div>
        ) : displayedPdfs.length === 0 ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (dragOverCategory !== activeCategory) setDragOverCategory(activeCategory);
            }}
            onDragLeave={() => {
              if (dragOverCategory === activeCategory) setDragOverCategory(null);
            }}
            onDrop={async (e) => {
              e.preventDefault();
              const pdfId = e.dataTransfer.getData("application/x-pdf-id") || draggedPdfId;
              setDragOverCategory(null);
              setDraggedPdfId(null);
              setDraggedIndex(null);
              if (pdfId && activeCategory !== "ALL") {
                await handleMovePdf(pdfId, activeCategory);
              }
            }}
            className={cn(
              "text-center py-12 px-4 border border-dashed rounded-sm transition-all",
              dragOverCategory === activeCategory
                ? "border-primary bg-primary/15 ring-2 ring-primary"
                : "border-primary/20 bg-black/20"
            )}
          >
            <div className="inline-flex p-3 rounded-full bg-primary/10 border border-primary/30 mb-3">
              <FolderArchive className="h-8 w-8 text-primary/70" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Category "{activeCategory}" is Empty
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Drag documents from other categories onto "{activeCategory}" or drop them here, or upload a new PDF directly to this category.
            </p>
            <Button
              onClick={() => handleOpenDialog(true)}
              variant="outline"
              size="sm"
              className="mt-4 border-primary/40 hover:border-primary hover:bg-primary/10 text-xs font-bold uppercase tracking-wider text-primary"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Upload PDF to {activeCategory}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {viewMode === "list" ? (
              <div className="border border-primary/25 rounded-md overflow-hidden bg-black/40 shadow-sm">
                <Table>
                  <TableHeader className="bg-black/60 border-b border-primary/25">
                    <TableRow className="border-primary/20 hover:bg-transparent">
                      <TableHead className="w-28 text-center font-bold uppercase tracking-wider text-xs text-primary/90 py-3">
                        #
                      </TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-xs text-primary/90 py-3">
                        Document Title
                      </TableHead>
                      <TableHead className="w-56 text-right font-bold uppercase tracking-wider text-xs text-primary/90 py-3 pr-4">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedPdfs.map((pdf, index) => {
                      const isPreviewing = previewPdfId === pdf.id;
                      const isDeleting = deletingId === pdf.id;
                      const isDragging = draggedIndex === index;
                      const isDragOver = dragOverIndex === index && draggedIndex !== index;
                      const ordinal = index + 1;

                      return (
                        <TableRow
                          key={pdf.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index, pdf.id)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
                          onDrop={(e) => handleDrop(e, index)}
                          className={`group transition-all duration-150 select-none ${
                            isDragging
                              ? "opacity-30 bg-primary/10 border-dashed border-primary"
                              : isDragOver
                                ? "bg-primary/20 border-t-2 border-t-primary shadow-gold"
                                : isPreviewing
                                  ? "bg-primary/10 border-primary/40 shadow-gold"
                                  : "border-primary/15 hover:bg-primary/5"
                          }`}
                        >
                          {/* Ordinal Column */}
                          <TableCell className="text-center font-mono py-3 pl-3 pr-2">
                            <div className="flex items-center justify-center gap-1.5">
                              <div
                                className="cursor-grab active:cursor-grabbing text-muted-foreground/70 group-hover:text-primary transition-colors p-1 rounded hover:bg-primary/10"
                                title="Drag to reorder"
                              >
                                <GripVertical className="h-4 w-4" />
                              </div>
                              <span className="inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded bg-primary/15 text-primary text-xs font-bold border border-primary/30">
                                {ordinal}
                              </span>
                              <div className="flex flex-col -my-1 ml-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  disabled={index === 0 || isSavingOrder}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMove(index, "up");
                                  }}
                                  className="text-muted-foreground hover:text-primary disabled:opacity-20 disabled:hover:text-muted-foreground p-0.5 leading-none transition-colors"
                                  title="Move up"
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === displayedPdfs.length - 1 || isSavingOrder}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMove(index, "down");
                                  }}
                                  className="text-muted-foreground hover:text-primary disabled:opacity-20 disabled:hover:text-muted-foreground p-0.5 leading-none transition-colors"
                                  title="Move down"
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </TableCell>

                          {/* Document Title Column */}
                          <TableCell className="py-3 px-3">
                            <div className="min-w-0">
                              {editingPdfId === pdf.id ? (
                                <div
                                  className="flex items-center gap-1.5"
                                  onClick={(e) => e.stopPropagation()}
                                  onDoubleClick={(e) => e.stopPropagation()}
                                >
                                  <Input
                                    value={editingTitle}
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleSaveTitle(pdf.id);
                                      } else if (e.key === "Escape") {
                                        e.preventDefault();
                                        handleCancelEditTitle();
                                      }
                                    }}
                                    onBlur={() => handleSaveTitle(pdf.id)}
                                    autoFocus
                                    className="h-7 text-sm font-bold bg-black/60 border-primary focus:border-primary px-2 max-w-sm"
                                  />
                                </div>
                              ) : (
                                <div
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEditTitle(pdf);
                                  }}
                                  className="cursor-pointer group/title select-none"
                                  title="Double-click to rename title"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-foreground hover:text-primary transition-colors truncate">
                                      {pdf.title}
                                    </span>
                                    {pdf.id === firstRulesPdfId && (
                                      <span
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider shrink-0"
                                        title="First PDF in Rules: This document provides the cover photo for the edition/game"
                                      >
                                        <BookOpen className="h-2.5 w-2.5 text-amber-400" />
                                        Cover
                                      </span>
                                    )}
                                  </div>
                                  {pdf.description && (
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                                      {pdf.description}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Actions Column */}
                          <TableCell className="py-3 pr-4 text-right">
                            <div className="flex items-center justify-end gap-2.5">
                              {pdf.file_size && (
                                <span className="text-[10px] uppercase font-bold font-mono tracking-wider px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-primary/10 shrink-0">
                                  {formatBytes(pdf.file_size)}
                                </span>
                              )}

                              <div className="flex items-center gap-1 shrink-0">
                                {isGameRulesPdfLink(pdf) && pdf.id !== firstRulesPdfId && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSetAsCover(pdf);
                                    }}
                                    className="h-7 px-2 text-[10px] font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 hover:bg-amber-500/15 border-amber-500/30"
                                    title="Set as edition cover (moves to #1 in Rules)"
                                  >
                                    <BookOpen className="h-3 w-3 mr-1 text-amber-400" />
                                    Set Cover
                                  </Button>
                                )}

                                {!pdf.cover_image && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleGenerateCover(e, pdf);
                                    }}
                                    disabled={generatingCoverId === pdf.id}
                                    className="h-7 px-2 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/15 border border-primary/20"
                                    title="Generate cover thumbnail from PDF"
                                  >
                                    {generatingCoverId === pdf.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <>
                                        <ImagePlus className="h-3 w-3 mr-1" />
                                        Cover
                                      </>
                                    )}
                                  </Button>
                                )}

                                <Button
                                  variant={isPreviewing ? "default" : "outline"}
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePreview(pdf.id);
                                  }}
                                  className={`h-7 w-7 p-0 ${
                                    isPreviewing
                                      ? "bg-primary text-black hover:bg-primary/90"
                                      : "border-primary/30 hover:border-primary hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                  }`}
                                  title={isPreviewing ? "Close Preview" : "Preview PDF"}
                                  aria-label={isPreviewing ? "Close Preview" : "Preview PDF"}
                                >
                                  {isPreviewing ? (
                                    <EyeOff className="h-3.5 w-3.5" />
                                  ) : (
                                    <Eye className="h-3.5 w-3.5" />
                                  )}
                                </Button>

                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 p-0 border-primary/30 hover:border-primary hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                  title="Open in new window"
                                  aria-label="Open in new window"
                                >
                                  <a
                                    href={pdf.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                </Button>

                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 p-0 border-primary/30 hover:border-primary hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                  title="Download PDF"
                                  aria-label="Download PDF"
                                >
                                  <a
                                    href={`/api/pdf-proxy?url=${encodeURIComponent(pdf.url)}&download=true&filename=${encodeURIComponent(pdf.title)}`}
                                    download={`${pdf.title}.pdf`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </a>
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isDeleting}
                                  onClick={(e) => handleDelete(e, pdf.id, pdf.title)}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  title="Delete PDF"
                                >
                                  {isDeleting ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              /* Grid View: Focused on thumbnail with doc title underneath */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {displayedPdfs.map((pdf, index) => {
                  const isPreviewing = previewPdfId === pdf.id;
                  const isDeleting = deletingId === pdf.id;
                  const isBeingDragged = draggedPdfId === pdf.id;
                  const coverUrl = pdf.cover_image ? getR2PublicUrl(pdf.cover_image) : null;

                  return (
                    <div
                      key={pdf.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index, pdf.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "group relative flex flex-col rounded-md border transition-all duration-200 overflow-hidden bg-black/50",
                        isBeingDragged && "opacity-30 border-dashed border-primary ring-2 ring-primary",
                        isPreviewing
                          ? "border-primary shadow-gold ring-1 ring-primary"
                          : "border-primary/25 hover:border-primary/60 hover:shadow-gold"
                      )}
                    >
                      {/* Thumbnail Container */}
                      <div
                        onClick={() => togglePreview(pdf.id)}
                        className="relative aspect-[3/4] w-full bg-neutral-950 flex items-center justify-center overflow-hidden border-b border-primary/20 cursor-pointer"
                      >
                        {pdf.id === firstRulesPdfId && (
                          <div className="absolute top-2 left-2 z-10">
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/85 backdrop-blur-sm text-amber-300 border border-amber-500/50 text-[10px] font-black uppercase tracking-wider shadow-lg"
                              title="First PDF in Rules: This document provides the cover photo for the edition/game"
                            >
                              <BookOpen className="h-2.5 w-2.5 text-amber-400" />
                              Cover
                            </span>
                          </div>
                        )}

                        {coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={coverUrl}
                            alt={pdf.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-3 text-center">
                            <FileText className="h-10 w-10 text-primary/40 mb-2" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              No Cover
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateCover(e, pdf);
                              }}
                              disabled={generatingCoverId === pdf.id}
                              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-2 font-semibold uppercase tracking-wider disabled:opacity-50"
                            >
                              {generatingCoverId === pdf.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <ImagePlus className="h-3 w-3" />
                                  Generate Cover
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {/* Actions Overlay */}
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-neutral-950/90 backdrop-blur-sm border border-primary/40 rounded p-1 shadow-xl z-20">
                          {isGameRulesPdfLink(pdf) && pdf.id !== firstRulesPdfId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetAsCover(pdf);
                              }}
                              className="h-6 w-6 p-0 text-amber-400 hover:text-amber-300 hover:bg-amber-500/20"
                              title="Set as edition cover (moves to #1 in Rules)"
                              aria-label="Set as edition cover"
                            >
                              <BookOpen className="h-3 w-3" />
                            </Button>
                          )}

                          <Button
                            variant={isPreviewing ? "default" : "ghost"}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePreview(pdf.id);
                            }}
                            className={`h-6 w-6 p-0 ${
                              isPreviewing
                                ? "bg-primary text-black hover:bg-primary/90"
                                : "text-muted-foreground hover:text-primary hover:bg-primary/20"
                            }`}
                            title={isPreviewing ? "Close Preview" : "Preview PDF"}
                            aria-label={isPreviewing ? "Close Preview" : "Preview PDF"}
                          >
                            {isPreviewing ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>

                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-primary hover:bg-primary/20"
                            title="Open in new window"
                            aria-label="Open in new window"
                          >
                            <a
                              href={pdf.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>

                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-primary hover:bg-primary/20"
                            title="Download PDF"
                            aria-label="Download PDF"
                          >
                            <a
                              href={`/api/pdf-proxy?url=${encodeURIComponent(pdf.url)}&download=true&filename=${encodeURIComponent(pdf.title)}`}
                              download={`${pdf.title}.pdf`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Download className="h-3 w-3" />
                            </a>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isDeleting}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(e, pdf.id, pdf.title);
                            }}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/20"
                            title="Delete PDF"
                            aria-label="Delete PDF"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Document Title Underneath */}
                      <div className="p-3 flex flex-col justify-between flex-1 bg-card/20">
                        <div>
                          <span
                            className="font-bold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug cursor-pointer"
                            title={pdf.title}
                            onClick={() => togglePreview(pdf.id)}
                          >
                            {pdf.title}
                          </span>
                          {pdf.description && (
                            <p
                              className="text-[11px] text-muted-foreground line-clamp-1 mt-1"
                              title={pdf.description}
                            >
                              {pdf.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-primary/10 text-[10px] text-muted-foreground gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {pdf.file_size ? (
                              <span className="font-mono uppercase font-semibold shrink-0">
                                {formatBytes(pdf.file_size)}
                              </span>
                            ) : null}
                            {isGameRulesPdfLink(pdf) && pdf.id !== firstRulesPdfId && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetAsCover(pdf);
                                }}
                                className="text-[10px] font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 hover:underline inline-flex items-center gap-0.5 ml-1"
                                title="Set as edition cover (moves to #1 in Rules)"
                              >
                                <BookOpen className="h-2.5 w-2.5" />
                                Make Cover
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => togglePreview(pdf.id)}
                            className={`p-1 rounded transition-colors shrink-0 ${
                              isPreviewing
                                ? "text-primary bg-primary/20"
                                : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                            }`}
                            title={isPreviewing ? "Close Preview" : "Preview PDF"}
                            aria-label={isPreviewing ? "Close Preview" : "Preview PDF"}
                          >
                            {isPreviewing ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Embedded PDF Viewer when Preview is active */}
            {activePreviewPdf && (
              <div className="mt-4 border-2 border-primary/40 rounded-sm overflow-hidden bg-black/60 shadow-2xl">
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-card border-b border-primary/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary truncate">
                      {activePreviewPdf.title}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 border border-primary/30 text-primary font-medium shrink-0">
                      {activePreviewPdf.pdf_category || "Rules"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs font-bold uppercase tracking-wider hover:text-primary text-muted-foreground"
                    >
                      <a href={activePreviewPdf.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Full Screen
                      </a>
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs font-bold uppercase tracking-wider hover:text-primary text-muted-foreground"
                    >
                      <a
                        href={`/api/pdf-proxy?url=${encodeURIComponent(activePreviewPdf.url)}&download=true&filename=${encodeURIComponent(activePreviewPdf.title)}`}
                        download={`${activePreviewPdf.title}.pdf`}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewPdfId(null)}
                      className="h-7 text-xs font-bold uppercase tracking-wider hover:text-primary text-muted-foreground"
                    >
                      Close
                    </Button>
                  </div>
                </div>

                <div className="w-full h-[650px] bg-neutral-900">
                  <iframe
                    src={`/api/pdf-proxy?url=${encodeURIComponent(activePreviewPdf.url)}#view=FitH`}
                    className="w-full h-full border-none"
                    title={activePreviewPdf.title}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rename Category Dialog */}
        <Dialog
          open={!!categoryToRename}
          onOpenChange={(open) => {
            if (!open) setCategoryToRename(null);
          }}
        >
          <DialogContent className="sm:max-w-md bg-card border-primary/30">
            <DialogHeader>
              <DialogTitle className="text-foreground">Rename Category</DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                Enter a new name for the &ldquo;{categoryToRename}&rdquo; category. All PDFs in this category will be updated.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleConfirmRenameCategory} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="rename-category-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Category Name
                </Label>
                <Input
                  id="rename-category-input"
                  value={renameCategoryInput}
                  onChange={(e) => setRenameCategoryInput(e.target.value)}
                  placeholder="e.g. Rulebooks, Quick Reference..."
                  autoFocus
                  disabled={isRenamingCategory}
                  className="bg-black/50 border-primary/30 focus:border-primary"
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isRenamingCategory}
                  onClick={() => setCategoryToRename(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isRenamingCategory || !renameCategoryInput.trim()}
                >
                  {isRenamingCategory ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Renaming...
                    </>
                  ) : (
                    "Save Name"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Category Confirmation Dialog */}
        <AlertDialog
          open={!!categoryToDeleteCustom}
          onOpenChange={(open) => {
            if (!open) setCategoryToDeleteCustom(null);
          }}
        >
          <AlertDialogContent className="bg-card border-destructive/40">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Delete Category &ldquo;{categoryToDeleteCustom}&rdquo;?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground text-xs">
                This will remove the category from your list. Any PDFs currently inside this category will be automatically moved to{" "}
                <span className="font-semibold text-primary">
                  &ldquo;{allCategories.find((c) => c.toLowerCase() !== categoryToDeleteCustom?.toLowerCase()) || "Rules"}&rdquo;
                </span>
                . No documents will be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel disabled={isDeletingCategory}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeletingCategory}
                onClick={handleConfirmDeleteCategory}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {isDeletingCategory ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Deleting...
                  </>
                ) : (
                  "Delete Category"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
