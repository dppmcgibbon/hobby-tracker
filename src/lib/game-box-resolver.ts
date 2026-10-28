export interface LinkedGameBox {
  id: string;
  name: string;
  location?: string | null;
  box_type?: string | null;
  game_id: string;
  edition_id?: string | null;
  expansion_id?: string | null;
}

export interface MiniatureGameRelation {
  game_id: string;
  edition_id?: string | null;
  expansion_id?: string | null;
}

export interface ResolvedBoxResult {
  box: LinkedGameBox;
  isExplicit: boolean;
  allMatchingBoxes?: LinkedGameBox[];
  cleanNotes: string | null;
}

/**
 * Resolves which physical Game Box a miniature is associated with.
 *
 * Rules:
 * A miniature is linked to a game box IF AND ONLY IF:
 * 1. Storage location is explicitly "IN BOX".
 * 2. It has a populated `game_box_id` that matches a valid box in `allGameBoxes`.
 */
export function resolveMiniatureGameBox(
  miniature: {
    game_box_id?: string | null;
    storage_box?: { id: string; name?: string | null; location?: string | null } | null;
    storage_boxes?: { id: string; name?: string | null; location?: string | null } | null;
    notes?: string | null;
    miniature_games?: MiniatureGameRelation[] | null;
  },
  allGameBoxes: LinkedGameBox[]
): ResolvedBoxResult | null {
  const storageName = miniature.storage_box?.name || miniature.storage_boxes?.name;
  const isStoredInBox = storageName ? storageName.trim().toUpperCase() === "IN BOX" : false;

  if (!isStoredInBox || !miniature.game_box_id || !allGameBoxes || allGameBoxes.length === 0) {
    return null;
  }

  const targetId = miniature.game_box_id.toLowerCase();
  const matchingBox = allGameBoxes.find((b) => b.id.toLowerCase() === targetId);

  if (!matchingBox) {
    return null;
  }

  return {
    box: matchingBox,
    isExplicit: true,
    cleanNotes: miniature.notes || null,
  };
}

/**
 * Legacy helper maintained for backward compatibility.
 */
export function extractExplicitBoxCode(notes?: string | null): {
  boxCode: string | null;
  cleanNotes: string | null;
} {
  return { boxCode: null, cleanNotes: notes || null };
}
