"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Download } from "lucide-react";
import { importMiniaturesFromCSV } from "@/app/actions/import";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function MiniatureCSVImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<{
    successCount: number;
    errorCount: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const downloadTemplate = () => {
    const template = `name,unit_type,quantity,material,base_size,sculptor,year
Space Marine,Intercessor,10,Plastic,32mm,Games Workshop,2020
Necron Warrior,Warrior,20,Plastic,32mm,Games Workshop,2020`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "miniatures_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }

    setIsImporting(true);

    try {
      const text = await file.text();
      const result = await importMiniaturesFromCSV(text);

      setResults(result);
      setShowResults(true);

      if (result.errorCount === 0) {
        toast.success(`Successfully imported ${result.successCount} miniatures`);
        router.refresh();
      } else {
        toast.warning(
          `Imported ${result.successCount} miniatures with ${result.errorCount} errors. Check details.`
        );
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import CSV");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="csv-file-input"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="gap-2"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import CSV
              </>
            )}
          </Button>
          <Button variant="outline" onClick={downloadTemplate} className="gap-2">
            <Download className="h-4 w-4" />
            Download Template
          </Button>
        </div>

        <Alert>
          <AlertDescription className="text-sm space-y-2">
            <p className="font-semibold">CSV Format:</p>
            <p>Required columns: <code className="bg-muted px-1 rounded">name</code></p>
            <p>
              Optional columns: <code className="bg-muted px-1 rounded">unit_type</code>,{" "}
              <code className="bg-muted px-1 rounded">quantity</code>,{" "}
              <code className="bg-muted px-1 rounded">material</code>,{" "}
              <code className="bg-muted px-1 rounded">base_size</code>,{" "}
              <code className="bg-muted px-1 rounded">sculptor</code>,{" "}
              <code className="bg-muted px-1 rounded">year</code>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Note: All miniatures will be imported with default status (backlog).
            </p>
          </AlertDescription>
        </Alert>
      </div>

      {/* Results Dialog */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Results</DialogTitle>
            <DialogDescription>
              {results && (
                <>
                  Successfully imported: {results.successCount} miniatures
                  {results.errorCount > 0 && <>, Failed: {results.errorCount}</>}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {results && results.errors.length > 0 && (
            <div className="space-y-2">
              <p className="font-semibold text-sm">Errors:</p>
              <div className="bg-muted p-4 rounded-sm max-h-96 overflow-y-auto">
                {results.errors.map((error, index) => (
                  <p key={index} className="text-sm text-destructive mb-1">
                    {error}
                  </p>
                ))}
              </div>
            </div>
          )}

          <Button onClick={() => setShowResults(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
