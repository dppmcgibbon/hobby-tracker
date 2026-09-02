import fs from "fs";
import path from "path";
import { supabase } from "./config";
import { uploadR2Object, deleteR2Object } from "../../src/lib/r2";

async function uploadImage(
  filePath: string,
  userId: string,
  miniatureId: string,
  caption?: string
) {
  const fileName = path.basename(filePath);
  const fileExt = path.extname(fileName);
  const storagePath = `${userId}/${miniatureId}/${Date.now()}${fileExt}`;

  // Read file
  const fileBuffer = fs.readFileSync(filePath);

  // Upload to R2 storage
  const contentType = fileExt.toLowerCase() === ".png" ? "image/png" : fileExt.toLowerCase() === ".webp" ? "image/webp" : "image/jpeg";
  const { key } = await uploadR2Object(storagePath, fileBuffer, contentType);

  // Save metadata to database
  const { data: photo, error: dbError } = await supabase
    .from("miniature_photos")
    .insert({
      miniature_id: miniatureId,
      user_id: userId,
      storage_path: key,
      caption: caption || null,
      photo_type: "progress",
    })
    .select()
    .single();

  if (dbError) {
    // Rollback: delete uploaded file from R2
    await deleteR2Object(key);
    throw dbError;
  }

  return photo;
}

async function uploadImagesFromDirectory(directory: string, userId: string, miniatureId: string) {
  console.log(`Uploading images from: ${directory}`);

  const files = fs.readdirSync(directory);
  const imageFiles = files.filter((f) =>
    [".jpg", ".jpeg", ".png", ".webp"].includes(path.extname(f).toLowerCase())
  );

  console.log(`Found ${imageFiles.length} images`);

  for (const file of imageFiles) {
    const filePath = path.join(directory, file);
    try {
      const photo = await uploadImage(filePath, userId, miniatureId, file);
      console.log(`✓ Uploaded ${file} (${photo.id})`);
    } catch (error) {
      console.error(`✗ Failed to upload ${file}:`, error);
    }
  }
}

// Export for use in other scripts
export { uploadImage, uploadImagesFromDirectory };
