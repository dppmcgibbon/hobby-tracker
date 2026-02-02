import fs from "fs";
import path from "path";
import { supabase } from "./config";

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

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from("miniature-photos")
    .upload(storagePath, fileBuffer, {
      contentType: `image/${fileExt.substring(1)}`,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  // Save metadata to database
  const { data: photo, error: dbError } = await supabase
    .from("miniature_photos")
    .insert({
      miniature_id: miniatureId,
      user_id: userId,
      storage_path: storagePath,
      caption: caption || null,
      photo_type: "progress",
    })
    .select()
    .single();

  if (dbError) {
    // Rollback: delete uploaded file
    await supabase.storage.from("miniature-photos").remove([storagePath]);
    throw dbError;
  }

  return photo;
}

async function uploadImagesFromDirectory(
  directory: string,
  userId: string,
  miniatureId: string
) {
  console.log(`Uploading images from: ${directory}`);

  const files = fs.readdirSync(directory);
  const imageFiles = files.filter((f) =>
    [".jpg", ".jpeg", ".png", ".webp"].includes(path.extname(f).toLowerCase())
  );

  console.log(`Found ${imageFiles.length} images`);

  let uploaded = 0;
  let errors = 0;

  for (const file of imageFiles) {
    const filePath = path.join(directory, file);

    try {
      await uploadImage(filePath, userId, miniatureId);
      uploaded++;
      console.log(`✅ Uploaded: ${file}`);
    } catch (error) {
      errors++;
      console.error(`❌ Failed to upload ${file}:`, error);
    }
  }

  console.log(`\n✅ Upload complete!`);
  console.log(`   Uploaded: ${uploaded}`);
  console.log(`   Errors: ${errors}`);
}

// Usage: npm run migrate:images <directory> <user-id> <miniature-id>
const directory = process.argv[2];
const userId = process.argv[3];
const miniatureId = process.argv[4];

if (!directory || !userId || !miniatureId) {
  console.error("Error: Missing required arguments");
  console.log("Usage: npm run migrate:images <directory> <user-id> <miniature-id>");
  process.exit(1);
}

uploadImagesFromDirectory(directory, userId, miniatureId)
  .then(() => {
    console.log("\nImage upload completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });