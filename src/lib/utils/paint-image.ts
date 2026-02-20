/**
 * Convert paint name to the filename component used by hobby-db paint images.
 * Pattern: <Type>_<Name>.svg (e.g. Base_AbaddonBlack.svg)
 * Name: remove spaces/special chars, PascalCase
 */
export function getPaintImagePath(type: string, name: string): string {
  const typePart = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  const namePart = name
    .replace(/'/g, "")
    .split(/[\s\-!]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
  return `/paints/${typePart}_${namePart}.svg`;
}
