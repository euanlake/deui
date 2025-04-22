#!/bin/bash

# Script to remove server-side code during R1 migration
echo "Starting server-side code cleanup for R1 migration..."

# 1. Remove server directory and all files
echo "Removing src/server directory..."
rm -rf src/server

# 2. Remove server-related type definitions
echo "Removing server-related type definitions..."
rm -f types/express.d.ts

# 3. Update tsconfig.json to remove server-related configs
echo "Updating TypeScript configuration..."
# Use sed to update tsconfig.json
# This would need to be customized based on actual tsconfig content

echo "Cleanup complete! The application is now a frontend-only client for R1."
echo "Please review the application to ensure all server references have been properly updated."
echo "See R1_MIGRATION.md for more details on the migration." 