"use client";

import { useState, useTransition } from "react";
import { Share2, Copy, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createShare, deleteShare } from "@/app/actions/sharing";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ShareButtonProps {
  miniatureId: string;
  existingShare?: {
    id: string;
    share_token: string;
    view_count: number;
  } | null;
}

export function ShareButton({ miniatureId, existingShare }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shareData, setShareData] = useState(existingShare);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const shareUrl = shareData ? `${window.location.origin}/share/${shareData.share_token}` : "";

  const handleCreateShare = () => {
    startTransition(async () => {
      try {
        const result = await createShare(miniatureId);
        setShareData(result.share);
        toast.success("Share link created");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create share link");
      }
    });
  };

  const handleDeleteShare = () => {
    if (!confirm("Are you sure you want to revoke this share link?")) return;

    startTransition(async () => {
      try {
        await deleteShare(miniatureId);
        setShareData(null);
        toast.success("Share link revoked");
        setIsOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to revoke share link");
      }
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Miniature</DialogTitle>
          <DialogDescription>
            {shareData
              ? "Anyone with this link can view this miniature"
              : "Create a public link to share this miniature"}
          </DialogDescription>
        </DialogHeader>

        {!shareData ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generate a public link that allows anyone to view this miniature, including photos and
              painting recipes.
            </p>
            <Button onClick={handleCreateShare} disabled={isPending} className="w-full">
              Generate Share Link
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Share Link</Label>
              <div className="flex gap-2 mt-2">
                <Input value={shareUrl} readOnly className="font-mono text-sm" />
                <Button size="icon" variant="outline" onClick={handleCopyLink}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div className="text-sm">
                <p className="font-medium">Views</p>
                <p className="text-muted-foreground">{shareData.view_count || 0} total views</p>
              </div>
            </div>

            <Button
              variant="destructive"
              onClick={handleDeleteShare}
              disabled={isPending}
              className="w-full"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Revoke Share Link
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
