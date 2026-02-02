# Data Migration Scripts

This directory contains scripts for importing data into the Warhammer 40K Tracker.

## Prerequisites

- Node.js 18+ installed
- Supabase project set up
- `.env.local` file with credentials

## Scripts

### 1. Import Factions

```bash
npm run migrate:factions [csv-path]
```

Imports factions from CSV. Default path: `./data/csv/factions.csv`

### 2. Import Paints

```bash
npm run migrate:paints [csv-path]
```

Imports Citadel paints from CSV. Default path: `./data/csv/paints.csv`

### 3. Import Miniatures

```bash
npm run migrate:miniatures <csv-path> <user-id>
```

Imports miniatures for a specific user. User ID is required.

### 4. Upload Images

```bash
npm run migrate:images <directory> <user-id> <miniature-id>
```

Uploads all images from a directory for a specific miniature.

### 5. Verify Data

```bash
npm run migrate:verify
```

Verifies that all data was imported correctly.

### 6. Backup Data

```bash
npm run backup
```

Creates a JSON backup of all data.

## CSV Format

### Factions CSV

```csv
name,army_type,description,color_hex
Ultramarines,loyalist,Description here,#0055AA
```

### Paints CSV

```csv
brand,name,type,color_hex
Citadel,Abaddon Black,base,#000000
```

### Miniatures CSV

```csv
name,faction_name,unit_type,quantity,material,base_size,sculptor,year,notes
Primaris Intercessors,Ultramarines,Troops,10,Plastic,32mm,GW,2017,Notes
```

## Full Migration Example

```bash
# 1. Import reference data
npm run migrate:factions
npm run migrate:paints

# 2. Verify imports
npm run migrate:verify

# 3. Get your user ID from Supabase Dashboard
# Authentication > Users > Copy ID

# 4. Import your collection
npm run migrate:miniatures ./data/csv/my-miniatures.csv YOUR_USER_ID

# 5. Upload photos (optional, per miniature)
npm run migrate:images ./data/images/squad1 YOUR_USER_ID MINIATURE_ID

# 6. Final verification
npm run migrate:verify
```

## Troubleshooting

- **"Missing Supabase credentials"**: Check `.env.local` file
- **Duplicate entries**: Scripts automatically skip existing records
- **Unknown faction**: Verify faction name matches exactly
- **Image upload fails**: Check file format (jpg, png, webp)

```