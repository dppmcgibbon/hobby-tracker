"use client";

import { useState } from "react";
import Image from "next/image";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ClickableImageProps {
  src: string;
  alt?: string;
  /** ClassName for the clickable wrapper (should include size e.g. relative w-16 h-16) */
  className?: string;
  /** ClassName for the inner Next/Image */
  imageClassName?: string;
}

export function ClickableImage({
  src,
  alt = "",
  className,
  imageClassName = "object-contain",
}: ClickableImageProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "block text-left cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded overflow-hidden",
          className
        )}
        title="Click to enlarge"
      >
        <Image
          src={src}
          alt={alt}
          fill
          className={imageClassName}
          unoptimized
        />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-fit max-w-[95vw] h-fit max-h-[95vh] sm:max-w-[95vw] flex flex-col items-center justify-center p-2 sm:p-4">
          <VisuallyHidden asChild>
            <DialogTitle>{alt || "Enlarged image"}</DialogTitle>
          </VisuallyHidden>
          <div className="w-fit h-fit">
            <img
              src={src}
              alt={alt}
              className="max-w-[95vw] max-h-[90vh] w-auto h-auto object-contain block"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
