export interface GameInfoLink {
  id: string;
  title: string;
  url: string;
  description?: string | null;
  category?: string | null;
  r2_key?: string | null;
  file_size?: number | null;
  storage_path?: string | null;
  caption?: string | null;
  uploaded_at?: string | null;
  image_updated_at?: string | null;
  position?: number | null;
  cover_image?: string | null;
}

export interface GameMetadata {
  coverUrl?: string;
  coverType?: "box" | "book";
  description: string;
  links: GameInfoLink[];
}

/**
 * Helper to identify whether a game link represents an uploaded image.
 */
export function isGameImageLink(link: GameInfoLink): boolean {
  const cat = link.category?.toLowerCase();
  const url = link.url?.toLowerCase() || "";
  const storagePath = (link.storage_path || link.r2_key || "").toLowerCase();
  return (
    cat === "image" ||
    storagePath.includes("/images/") ||
    url.includes("/images/") ||
    /\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(url)
  );
}

/**
 * Helper to identify whether a game link represents an uploaded or linked PDF document.
 */
export function isGamePdfLink(link: GameInfoLink): boolean {
  if (isGameImageLink(link)) return false;
  const cat = link.category?.toLowerCase();
  const url = link.url?.toLowerCase() || "";
  const storagePath = (link.storage_path || link.r2_key || "").toLowerCase();
  return (
    cat === "pdf" ||
    storagePath.includes("/pdfs/") ||
    url.endsWith(".pdf") ||
    url.includes(".pdf?") ||
    url.includes("/pdfs/")
  );
}

/**
 * Sorts PDF links by their explicit ordinal position (1, 2, 3...) if present,
 * falling back to alphabetical comparison by title.
 */
export function sortGamePdfLinks(links: GameInfoLink[]): GameInfoLink[] {
  return [...links].sort((a, b) => {
    const posA = typeof a.position === "number" ? a.position : undefined;
    const posB = typeof b.position === "number" ? b.position : undefined;
    if (posA !== undefined && posB !== undefined) {
      if (posA !== posB) return posA - posB;
    } else if (posA !== undefined) {
      return -1;
    } else if (posB !== undefined) {
      return 1;
    }
    return a.title.localeCompare(b.title, undefined, { sensitivity: "base", numeric: true });
  });
}

/**
 * Helper to identify whether a game link represents a general resource link.
 */
export function isGameResourceLink(link: GameInfoLink): boolean {
  return !isGamePdfLink(link) && !isGameImageLink(link);
}

// Curated lore and cover metadata for known games, editions, and expansions
const CURATED_DETAILS: Record<string, Partial<GameMetadata>> = {
  // Games
  "Warhammer 40,000": {
    coverType: "book",
    description:
      "Warhammer 40,000 is a grimdark tabletop miniature wargame produced by Games Workshop. Set in the dystopian 41st millennium where humanity battles savage aliens, dark gods, and traitors, players command armies of finely detailed Citadel miniatures on tabletop battlefields.",
  },
  "Combat Patrol": {
    coverType: "box",
    description:
      "Combat Patrol is the streamlined, accessible format for Warhammer 40,000. Played with the contents of a single Combat Patrol box per player on a compact battlefield, it delivers fast-paced tactical battles with balanced rules straight out of the box.",
  },
  "Kill Team": {
    coverType: "box",
    description:
      "Kill Team is a fast-paced tabletop skirmish wargame where elite operatives clash in tense, close-quarters firefights. With alternating activations, rich narrative campaigns, and deep customization, each operative matters in high-stakes tactical engagements.",
  },

  // Expansions & Box Sets
  Hivestorm: {
    coverType: "box",
    description:
      "Kill Team: Hivestorm is the flagship launch box for the 2024 edition of Kill Team. It plunges players into the war-torn spire city of Volkus, pitting the elite airborne Tempestus Aquilons of the Astra Militarum against the lethal, aerial Vespid Stingwings of the T'au Empire. Includes all-new Killzone: Volkus terrain, equipment packs, and core rules.",
  },
  "Into the Dark": {
    coverType: "box",
    description:
      "Kill Team: Into the Dark brings the battle inside the ancient and terrifying corridors of the Space Hulk Gallowdark. Introducing dynamic close-quarters battle rules, modular interior bulkhead walls, and hatchways, it pits the Imperial Navy Breachers against the Kroot Farstalker Kinband.",
  },
  Chalnath: {
    coverType: "box",
    description:
      "Set amidst the burning urban ruins of the Chalnath Expanse, this expansion depicts the pious fury of the Adepta Sororitas Novitiates battling the augmented T'au Empire Pathfinder Kill Team with stealth and cutting-edge pulse technology.",
  },
  Nachmund: {
    coverType: "box",
    description:
      "Set in the strategically vital Nachmund Gauntlet, this box features the agile and deadly Corsair Voidscarred Aeldari fighting against the brutal, mutated Legionaries of the Heretic Astartes amongst sector imperialis terrain.",
  },
  Moroch: {
    coverType: "box",
    description:
      "Moroch captures the desperate struggle on an Imperial frontier world, fielding Space Marine Vanguard Phobos Strike Teams against the corrupt, traitorous Blooded forces of Chaos armed with heavy lascannons and Ogryn brutes.",
  },
  Shadowvaults: {
    coverType: "box",
    description:
      "Delving into the deeper crypts of the Space Hulk Gallowdark, Shadowvaults features elite Imperial Guard Kasrkin stormtroopers against the ancient Necron Hierotek Circle led by a Cryptek and Plasmacytes.",
  },
  Soulshackle: {
    coverType: "box",
    description:
      "Soulshackle showcases the cold, brutal justice of the Adeptus Arbites Exaction Squad clashing with the sadism of the Drukhari Hand of the Archon within the dark holds of the Gallowdark space hulk.",
  },
  Gallowfall: {
    coverType: "box",
    description:
      "The apocalyptic finale to the Gallowdark saga. As the space hulk begins breaking apart and plummeting toward a planet below, the rugged Leagues of Votann Hearthkyn Salvagers make a desperate exit against the rampaging Fellgor Ravagers Chaos Beastmen.",
  },
  "Ashes of Faith": {
    coverType: "box",
    description:
      "A narrative campaign expansion pitting an Inquisitorial Agent kill team backed by Tempestus Scions and Sisters of Silence against an entrenched Chaos Cult striving to summon daemonic powers to overthrow a world.",
  },
  Salvation: {
    coverType: "box",
    description:
      "Set across the toxic oceanic rigs of Bheta-Decima, Salvation features Space Marine Scouts undergoing their trials of fire against the master stealth warriors of the Aeldari Striking Scorpions.",
  },
  Nightmare: {
    coverType: "box",
    description:
      "Nightmare brings terror to the extraction platforms of Bheta-Decima as the sadistically stealthy Mandrakes of Commorragh face off against the terror troops of the Night Lords Nemesis Claw.",
  },
  Termination: {
    coverType: "box",
    description:
      "Termination captures intense planetary industrial skirmishes between the survivalist Hernkyn Yaegirs of the Leagues of Votann and the rebellious Brooded Brothers of the Genestealer Cults.",
  },
  "Starter Set": {
    coverType: "box",
    description:
      "The comprehensive entry point into tabletop skirmish gaming, containing complete operative teams, core rulebooks, tokens, dice, measurement gauges, and gaming board terrain.",
  },
};

/**
 * Resolves metadata, description, cover type, and info links for any game, edition, or expansion.
 * Cleared of inaccurate/hardcoded default links; only returns user-specified links or an empty array.
 */
export function getGameDetails(
  name: string,
  fallbackDescription?: string | null,
  customLinks?: GameInfoLink[] | null
): GameMetadata {
  const curated = CURATED_DETAILS[name] || {};
  const description =
    fallbackDescription && fallbackDescription.trim().length > 0
      ? fallbackDescription
      : curated.description ||
        `Official release and gaming content for ${name}. Track your rules, expansions, and miniature collections.`;

  return {
    coverUrl: curated.coverUrl,
    coverType: curated.coverType || "box",
    description,
    links: Array.isArray(customLinks) ? customLinks : [],
  };
}
