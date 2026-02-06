#!/bin/bash

# Test script to verify the miniature_statuses table was created correctly

echo "Testing miniature_statuses migration..."
echo ""

# Check if miniature_statuses table exists and has all 13 statuses
echo "1. Checking miniature_statuses table..."
supabase db exec "SELECT name, display_order FROM miniature_statuses ORDER BY display_order;" --local

echo ""
echo "2. Checking if constraint was dropped on miniature_status table..."
supabase db exec "SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'miniature_status' AND constraint_type = 'CHECK';" --local

echo ""
echo "✅ Migration verification complete!"
