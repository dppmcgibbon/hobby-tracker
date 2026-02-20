"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { updateCollectRow } from "@/app/actions/collect";
import type { CollectConfigRow } from "@/lib/queries/collect";

interface CollectRowFormProps {
  app: string;
  row: Record<string, unknown>;
  tableConfig: CollectConfigRow[];
  onSave: () => void;
  onCancel: () => void;
}

export function CollectRowForm({
  app,
  row,
  tableConfig,
  onSave,
  onCancel,
}: CollectRowFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>(
    () => ({ ...row } as Record<string, unknown>)
  );

  const handleChange = (columnName: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [columnName]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateCollectRow(app, Number(row.id), formData);
      onSave();
    } catch (err) {
      console.error("Failed to update:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {tableConfig.map((column) => {
          const val = formData[column.column_name];
          const label = column.column_name.replace(/_/g, " ");

          if (column.column_name === "id") return null;

          switch (column.column_type) {
            case "checkbox":
              return (
                <div key={column.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${row.id}-${column.column_name}`}
                    checked={Boolean(val)}
                    onCheckedChange={(checked) =>
                      handleChange(column.column_name, !!checked)
                    }
                  />
                  <Label
                    htmlFor={`${row.id}-${column.column_name}`}
                    className="text-sm font-medium capitalize"
                  >
                    {label}
                  </Label>
                </div>
              );
            case "number":
            case "sequence":
              return (
                <div key={column.id} className="space-y-2">
                  <Label htmlFor={`${row.id}-${column.column_name}`} className="text-sm font-medium capitalize">
                    {label}
                  </Label>
                  <Input
                    id={`${row.id}-${column.column_name}`}
                    type="number"
                    value={val != null && val !== "" ? Number(val) : ""}
                    onChange={(e) =>
                      handleChange(
                        column.column_name,
                        e.target.value === "" ? null : parseInt(e.target.value, 10)
                      )
                    }
                    className="border-primary/30"
                  />
                </div>
              );
            case "url":
            case "text":
            case "center":
            case "series":
            case "faction":
            case "status":
            case "image":
            default:
              return (
                <div key={column.id} className="space-y-2">
                  <Label htmlFor={`${row.id}-${column.column_name}`} className="text-sm font-medium capitalize">
                    {label}
                  </Label>
                  <Input
                    id={`${row.id}-${column.column_name}`}
                    type="text"
                    value={String(val ?? "")}
                    onChange={(e) =>
                      handleChange(column.column_name, e.target.value || null)
                    }
                    className="border-primary/30"
                  />
                </div>
              );
          }
        })}
      </div>
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="btn-warhammer-primary"
        >
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
