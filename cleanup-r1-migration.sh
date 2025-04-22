#!/bin/bash

# R1 Migration Cleanup Script
# This script performs all the necessary cleanup steps for migrating from the old server-based architecture
# to the R1 API-based architecture

echo "====== R1 Migration Cleanup ======"
echo "Starting server-side code cleanup..."

# 1. Create backup directory
BACKUP_DIR="./backup-server-$(date +%Y%m%d%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "Created backup directory at $BACKUP_DIR"

# 2. Backup server directory before removing
if [ -d "./src/server" ]; then
  echo "Backing up src/server directory..."
  cp -r ./src/server "$BACKUP_DIR/"
fi

# 3. Backup express type definitions
if [ -f "./types/express.d.ts" ]; then
  echo "Backing up express type definitions..."
  mkdir -p "$BACKUP_DIR/types"
  cp ./types/express.d.ts "$BACKUP_DIR/types/"
fi

# 4. Remove server directory
echo "Removing src/server directory..."
rm -rf ./src/server

# 5. Remove server-related type definitions
echo "Removing server-related type definitions..."
rm -f ./types/express.d.ts

# 6. Log completion
echo ""
echo "====== Cleanup Complete ======"
echo "The application is now a frontend-only client for R1."
echo "Server-side code has been backed up to: $BACKUP_DIR"
echo ""
echo "Next Steps:"
echo "1. Review the application to ensure all server references have been updated."
echo "2. Fix any remaining linter errors in the codebase."
echo "3. Test the application's connection with R1."
echo ""
echo "For more details, see R1_MIGRATION.md" 