# Phase 8: Next Steps and Database Setup

## Important: Database Migrations Required

Before the Phase 8 3D printing features will work, you need to run the database migrations to create the new tables:

### Step 1: Push Migrations to Supabase

```bash
npx supabase db push
```

Or if using the npm script:

```bash
npm run supabase:push
```

This will create the following new tables:
- `materials` - Resin, filament, and powder inventory
- `stl_files` - STL file metadata
- `print_profiles` - Print settings templates  
- `prints` - Print queue and history
- `stl_tags` - Junction table for tagging STL files

And two storage buckets:
- `stl-files` - Private storage for STL files
- `stl-thumbnails` - Public storage for thumbnails

### Step 2: Regenerate TypeScript Types

After running the migrations, regenerate the TypeScript types so the new tables are recognized:

```bash
npx supabase gen types typescript --local > src/types/database.types.ts
```

If you're using remote (not local):

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts
```

### Step 3: Verify Type Checking

Run the type checker to ensure everything compiles:

```bash
npm run type-check
```

## Current Status

### ✅ Completed
- Database migration files created
- Server actions implemented
- Validation schemas created
- UI components built
- Pages created
- Navigation updated
- Type definitions for stl-viewer library

### ⏳ Pending (User Action Required)
- Run database migrations
- Regenerate TypeScript types
- Test the features in the browser

## Known Type Errors

The following type errors are expected until migrations are run:

```
src/types/index.ts: Type '"materials"' does not satisfy the constraint...
src/types/index.ts: Type '"stl_files"' does not satisfy the constraint...
src/types/index.ts: Type '"print_profiles"' does not satisfy the constraint...
src/types/index.ts: Type '"prints"' does not satisfy the constraint...
src/types/index.ts: Type '"stl_tags"' does not satisfy the constraint...
```

These errors occur because the new tables don't exist in `database.types.ts` yet. They will be resolved after running migrations and regenerating types.

## Testing Checklist

After running migrations, test the following:

### STL Library
- [ ] Navigate to "3D Printing > STL Library"
- [ ] Upload an STL file
- [ ] View STL file in 3D viewer
- [ ] Download STL file
- [ ] Delete STL file

### Materials Inventory
- [ ] Navigate to "3D Printing > Materials"
- [ ] Add a resin material
- [ ] Add a filament material
- [ ] Adjust material quantities
- [ ] Edit material details
- [ ] Delete a material

### Print Queue
- [ ] Navigate to "3D Printing > Print Queue"
- [ ] Create a print job
- [ ] Update print status (queued → printing → completed)
- [ ] Link a print to a miniature
- [ ] View print history
- [ ] Delete a print job

### Integration
- [ ] Verify material quantity decreases when print completes
- [ ] Check that prints link correctly to STL files
- [ ] Verify prints show in STL file detail page
- [ ] Test filtering and tabs on all pages

## Troubleshooting

### Issue: "table does not exist" errors
**Solution:** Run `npm run supabase:push` to create the tables

### Issue: TypeScript errors about missing properties
**Solution:** Regenerate types after migrations with `supabase gen types typescript`

### Issue: 3D viewer not loading
**Solution:** Check browser console for errors. Ensure STL file uploaded correctly to Supabase storage

### Issue: File upload fails
**Solution:** Verify storage buckets were created by migrations. Check RLS policies in Supabase dashboard

## Architecture Notes

### File Upload Flow
1. User selects STL file in upload dialog
2. Frontend uploads file to Supabase storage bucket
3. Storage path is saved to `stl_files` table
4. Thumbnail (if provided) uploaded to separate bucket
5. 3D viewer loads file via signed URL

### Print Workflow
1. User creates print job from STL file
2. Print starts in "queued" status
3. User updates to "printing" when started (timestamps automatically set)
4. On completion, status changes to "completed"
5. Material quantity is automatically deducted based on `material_used_ml`

### Material Tracking
- Quantities can be adjusted manually with +/- buttons
- Print completion automatically deducts material
- Quantities default to null (unlimited) if not set
- Visual progress bar helps monitor inventory levels

## Future Enhancements

See `docs/PHASE_8_UI_COMPLETE.md` for a complete list of potential future features.

## Support

If you encounter issues:
1. Check Supabase dashboard for migration status
2. Verify RLS policies are correct
3. Check browser console for JavaScript errors
4. Ensure all dependencies are installed (`npm install`)
