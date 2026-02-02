"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { Game, Edition, Expansion } from "@/types";

interface GameSelectorProps {
  selectedGameId?: string | null;
  selectedEditionId?: string | null;
  selectedExpansionId?: string | null;
  onGameChange: (gameId: string | null) => void;
  onEditionChange: (editionId: string | null) => void;
  onExpansionChange: (expansionId: string | null) => void;
}

export function GameSelector({
  selectedGameId,
  selectedEditionId,
  selectedExpansionId,
  onGameChange,
  onEditionChange,
  onExpansionChange,
}: GameSelectorProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [expansions, setExpansions] = useState<Expansion[]>([]);
  const [loading, setLoading] = useState(true);

  // Load games on mount
  useEffect(() => {
    const loadGames = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("games").select("*").order("name");
      if (data) setGames(data);
      setLoading(false);
    };
    loadGames();
  }, []);

  // Load editions when game changes
  useEffect(() => {
    const loadEditions = async () => {
      if (!selectedGameId) {
        setEditions([]);
        return;
      }
      const supabase = createClient();
      const { data } = await supabase
        .from("editions")
        .select("*")
        .eq("game_id", selectedGameId)
        .order("sequence");
      if (data) setEditions(data);
    };
    loadEditions();
  }, [selectedGameId]);

  // Load expansions when edition changes
  useEffect(() => {
    const loadExpansions = async () => {
      if (!selectedEditionId) {
        setExpansions([]);
        return;
      }
      const supabase = createClient();
      const { data } = await supabase
        .from("expansions")
        .select("*")
        .eq("edition_id", selectedEditionId)
        .order("sequence");
      if (data) setExpansions(data);
    };
    loadExpansions();
  }, [selectedEditionId]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Game</Label>
        <Select
          value={selectedGameId || "none"}
          onValueChange={(value) => {
            const newGameId = value === "none" ? null : value;
            onGameChange(newGameId);
            onEditionChange(null);
            onExpansionChange(null);
          }}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a game (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No game</SelectItem>
            {games.map((game) => (
              <SelectItem key={game.id} value={game.id}>
                {game.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedGameId && editions.length > 0 && (
        <div className="space-y-2">
          <Label>Edition (Optional)</Label>
          <Select
            value={selectedEditionId || "none"}
            onValueChange={(value) => {
              const newEditionId = value === "none" ? null : value;
              onEditionChange(newEditionId);
              onExpansionChange(null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an edition (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No edition</SelectItem>
              {editions.map((edition) => (
                <SelectItem key={edition.id} value={edition.id}>
                  {edition.name}
                  {edition.year && ` (${edition.year})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedEditionId && expansions.length > 0 && (
        <div className="space-y-2">
          <Label>Expansion (Optional)</Label>
          <Select
            value={selectedExpansionId || "none"}
            onValueChange={(value) => {
              onExpansionChange(value === "none" ? null : value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an expansion (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No expansion</SelectItem>
              {expansions.map((expansion) => (
                <SelectItem key={expansion.id} value={expansion.id}>
                  {expansion.name}
                  {expansion.year && ` (${expansion.year})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
