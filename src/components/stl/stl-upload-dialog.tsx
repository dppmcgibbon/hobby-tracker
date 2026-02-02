"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { stlFileSchema, type StlFileInput } from "@/lib/validations/stl";
import { uploadStlFile } from "@/app/actions/stl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function StlUploadDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stlFile, setStlFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const form = useForm<StlFileInput>({
    resolver: zodResolver(stlFileSchema),
    defaultValues: {
      name: "",
      description: "",
      source: "",
      source_url: "",
      designer: "",
      license: "",
      is_supported: false,
      scale_factor: 1.0,
    },
  });

  const onSubmit = async (data: StlFileInput) => {
    if (!stlFile) {
      toast.error("Please select an STL file");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", stlFile);
      formData.append("name", data.name);
      if (data.description) formData.append("description", data.description);
      if (data.source) formData.append("source", data.source);
      if (data.source_url) formData.append("source_url", data.source_url);
      if (data.designer) formData.append("designer", data.designer);
      if (data.license) formData.append("license", data.license);
      if (thumbnailFile) formData.append("thumbnail", thumbnailFile);

      const result = await uploadStlFile(formData);

      if (result.success) {
        toast.success("STL file uploaded successfully");
        setOpen(false);
        form.reset();
        setStlFile(null);
        setThumbnailFile(null);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to upload STL file");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload STL file");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload STL
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload STL File</DialogTitle>
          <DialogDescription>Upload a 3D model file to your STL library</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stl-file">STL File *</Label>
              <Input
                id="stl-file"
                type="file"
                accept=".stl"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setStlFile(file);
                    if (!form.getValues("name")) {
                      form.setValue("name", file.name.replace(".stl", ""));
                    }
                  }
                }}
                disabled={uploading}
              />
              {stlFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {stlFile.name} ({(stlFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="thumbnail-file">Thumbnail (optional)</Label>
              <Input
                id="thumbnail-file"
                type="file"
                accept="image/*"
                onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                disabled={uploading}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Model name" {...field} disabled={uploading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description of the model..."
                      {...field}
                      value={field.value || ""}
                      disabled={uploading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., MyMiniFactory"
                        {...field}
                        value={field.value || ""}
                        disabled={uploading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="designer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designer</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Designer name"
                        {...field}
                        value={field.value || ""}
                        disabled={uploading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="source_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://..."
                        {...field}
                        value={field.value || ""}
                        disabled={uploading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="license"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., CC BY 4.0"
                        {...field}
                        value={field.value || ""}
                        disabled={uploading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploading || !stlFile}>
                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upload
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
