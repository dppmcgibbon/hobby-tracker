"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Dynamic import to avoid SSR issues with Three.js
const StlViewer = dynamic(() => import("stl-viewer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] flex items-center justify-center bg-slate-900 rounded-lg">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <p className="text-sm text-slate-400">Loading 3D viewer...</p>
      </div>
    </div>
  ),
});

interface StlViewerComponentProps {
  storagePath: string;
  className?: string;
  height?: number;
}

export function StlViewerComponent({
  storagePath,
  className,
  height = 400,
}: StlViewerComponentProps) {
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerReady, setViewerReady] = useState(false);

  useEffect(() => {
    const loadStlFile = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Loading STL file from:", storagePath);

        const supabase = createClient();
        const { data, error: storageError } = await supabase.storage
          .from("stl-files")
          .createSignedUrl(storagePath, 3600);

        if (storageError) {
          console.error("Storage error:", storageError);
          throw storageError;
        }

        if (data?.signedUrl) {
          console.log("STL URL loaded successfully");
          setStlUrl(data.signedUrl);
        } else {
          throw new Error("No signed URL returned");
        }
      } catch (err) {
        console.error("Error loading STL file:", err);
        setError(err instanceof Error ? err.message : "Failed to load STL file");
      } finally {
        setLoading(false);
      }
    };

    loadStlFile();
  }, [storagePath]);

  if (loading) {
    return (
      <div className={`w-full ${className}`} style={{ height: `${height}px` }}>
        <div className="w-full h-full flex items-center justify-center bg-slate-900 rounded-lg">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            <p className="text-sm text-slate-400">Loading STL file...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stlUrl) {
    return (
      <Card
        className={`w-full ${className} flex items-center justify-center`}
        style={{ height: `${height}px` }}
      >
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Failed to load 3D model"}</AlertDescription>
        </Alert>
      </Card>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height: `${height}px`, width: "100%" }}>
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center bg-slate-900 rounded-lg">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              <p className="text-sm text-slate-400">Rendering 3D model...</p>
            </div>
          </div>
        }
      >
        {!viewerReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 rounded-lg z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              <p className="text-sm text-slate-400">Rendering 3D model...</p>
              <p className="text-xs text-slate-500">This may take a moment for large files</p>
            </div>
          </div>
        )}
        <StlViewer
          url={stlUrl}
          width="100%"
          height={height}
          modelColor="#64748b"
          backgroundColor="#0f172a"
          rotate={true}
          orbitControls={true}
          onFinishLoading={() => {
            console.log("3D model rendered successfully");
            setViewerReady(true);
          }}
        />
      </Suspense>
    </div>
  );
}
