import { Badge } from "@/components/ui/badge";
import type { RecipeStep, Paint } from "@/types";

interface RecipeStepWithPaint extends RecipeStep {
  paint?: Paint | null;
}

interface RecipeStepDisplayProps {
  step: RecipeStepWithPaint;
  stepNumber: number;
}

const techniqueColors: Record<string, string> = {
  base: "bg-amber-500",
  layer: "bg-blue-500",
  shade: "bg-purple-500",
  wash: "bg-indigo-500",
  drybrush: "bg-orange-500",
  highlight: "bg-yellow-500",
  glaze: "bg-teal-500",
  blend: "bg-pink-500",
  edge_highlight: "bg-lime-500",
  stipple: "bg-cyan-500",
};

const techniqueLabels: Record<string, string> = {
  base: "Base Coat",
  layer: "Layer",
  shade: "Shade",
  wash: "Wash",
  drybrush: "Dry Brush",
  highlight: "Highlight",
  glaze: "Glaze",
  blend: "Blend",
  edge_highlight: "Edge Highlight",
  stipple: "Stipple",
};

export function RecipeStepDisplay({ step, stepNumber }: RecipeStepDisplayProps) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
          {stepNumber}
        </div>
      </div>

      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge className={techniqueColors[step.technique] || "bg-gray-500"}>
            {techniqueLabels[step.technique] || step.technique}
          </Badge>

          {step.paint && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-muted">
              <div
                className="w-5 h-5 rounded border border-border"
                style={{ backgroundColor: step.paint.color_hex || "#888" }}
              />
              <span className="text-sm font-medium">
                {step.paint.brand} - {step.paint.name}
              </span>
            </div>
          )}
        </div>

        {step.notes && <p className="text-sm text-muted-foreground">{step.notes}</p>}
      </div>
    </div>
  );
}
