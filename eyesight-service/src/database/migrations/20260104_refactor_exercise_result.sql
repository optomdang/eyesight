-- Migration: Refactor ExerciseResult Model
-- Date: 2026-01-04
-- Description: Replace completed+passedLevel with status STRING, add config snapshot and timestamps
-- Status values: incomplete | passed | failed

-- ============================================
-- STEP 1: Add new columns
-- ============================================

-- Add status column with STRING type (not ENUM for flexibility)
ALTER TABLE "ExerciseResults" 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'incomplete' NOT NULL;

-- Add exerciseConfig JSONB for config snapshot (audit trail)
ALTER TABLE "ExerciseResults" 
ADD COLUMN IF NOT EXISTS "exerciseConfig" JSONB;

COMMENT ON COLUMN "ExerciseResults"."exerciseConfig" IS 'Snapshot of exercise config at start time for audit trail';

-- Add startedAt timestamp
ALTER TABLE "ExerciseResults" 
ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN "ExerciseResults"."startedAt" IS 'When the exercise was started';

-- Add completedAt timestamp
ALTER TABLE "ExerciseResults" 
ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN "ExerciseResults"."completedAt" IS 'When the exercise was completed (passed or failed)';

-- ============================================
-- STEP 2: Migrate existing data
-- ============================================

-- Convert old boolean fields to new status STRING
-- completed=true AND passedLevel=true -> 'passed'
-- completed=true AND passedLevel=false -> 'failed'
-- completed=false -> 'incomplete'
UPDATE "ExerciseResults"
SET 
    status = CASE
        WHEN completed = true AND "passedLevel" = true THEN 'passed'
        WHEN completed = true AND "passedLevel" = false THEN 'failed'
        ELSE 'incomplete'
    END,
    "startedAt" = "createdAt",
    "completedAt" = CASE
        WHEN completed = true THEN "updatedAt"
        ELSE NULL
    END
WHERE status IS NULL OR status = 'incomplete';

-- ============================================
-- STEP 3: Add indexes for new status field
-- ============================================

-- Index on status for filtering
CREATE INDEX IF NOT EXISTS idx_exerciseresults_status 
ON "ExerciseResults" (status);

-- Composite index for session + status queries
CREATE INDEX IF NOT EXISTS idx_exerciseresults_session_status 
ON "ExerciseResults" ("exerciseSessionId", status);

-- ============================================
-- STEP 4: Remove old columns and indexes
-- ============================================

-- Drop old index that uses removed columns
DROP INDEX IF EXISTS idx_exerciseresults_type_completed;

-- Remove old columns (keep reviewedBy, reviewedAt, reviewNotes for future use)
ALTER TABLE "ExerciseResults" DROP COLUMN IF EXISTS completed;
ALTER TABLE "ExerciseResults" DROP COLUMN IF EXISTS "passedLevel";
ALTER TABLE "ExerciseResults" DROP COLUMN IF EXISTS "passConditions";
ALTER TABLE "ExerciseResults" DROP COLUMN IF EXISTS "exerciseType";

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify new columns exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ExerciseResults' AND column_name = 'status'
    ) THEN
        RAISE EXCEPTION 'Migration failed: status column not created';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ExerciseResults' AND column_name = 'exerciseConfig'
    ) THEN
        RAISE EXCEPTION 'Migration failed: exerciseConfig column not created';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ExerciseResults' AND column_name = 'startedAt'
    ) THEN
        RAISE EXCEPTION 'Migration failed: startedAt column not created';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ExerciseResults' AND column_name = 'completedAt'
    ) THEN
        RAISE EXCEPTION 'Migration failed: completedAt column not created';
    END IF;
END$$;

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 20260104_refactor_exercise_result completed successfully';
    RAISE NOTICE 'Status values: incomplete | passed | failed';
END$$;
