# Cleanup Validation Framework

This framework provides utilities and property-based tests to validate the removal of backward compatibility code from the Eye-Sight system.

## Overview

The cleanup validation framework consists of three main components:

1. **FileScanner** - Utilities for scanning and detecting legacy patterns in code files
2. **GitCheckpoint** - Utilities for creating safe rollback points during cleanup
3. **Property-Based Tests** - Automated tests that validate complete removal of legacy patterns

## Components

### FileScanner (`tests/utils/fileScanner.js`)

The FileScanner class provides methods to:
- Scan all files of specific types (models, services, routes, validations, etc.)
- Search for legacy patterns using regex
- Read file contents safely
- Find files containing specific patterns

**Usage:**
```javascript
const FileScanner = require('../utils/fileScanner');

const scanner = new FileScanner();

// Get all model files
const modelFiles = scanner.getModelFiles();

// Get all service files
const serviceFiles = scanner.getServiceFiles();

// Check if a file contains legacy patterns
const legacyPatterns = FileScanner.getLegacyPatterns();
const hasLegacy = scanner.containsPatterns('path/to/file.js', legacyPatterns.modelPatterns);

// Find all files with specific patterns
const matches = scanner.findFilesWithPatterns(modelFiles, legacyPatterns.modelPatterns);
```

### GitCheckpoint (`tests/utils/gitCheckpoint.js`)

The GitCheckpoint class provides methods to:
- Check git repository status
- Create checkpoint commits
- Create backup branches
- Rollback to previous commits
- Stash and apply changes

**Usage:**
```javascript
const GitCheckpoint = require('../utils/gitCheckpoint');

const checkpoint = new GitCheckpoint();

// Check if in a git repository
if (checkpoint.isGitRepository()) {
  // Create a backup branch before cleanup
  const backupBranch = checkpoint.createBackupBranch();
  
  // Create a checkpoint after completing a phase
  const commitHash = checkpoint.createCheckpoint('Completed model cleanup');
  
  // Rollback if needed
  checkpoint.rollbackToCommit(commitHash);
}
```

### Property-Based Tests (`tests/cleanup-validation/cleanup-properties.test.js`)

The property-based tests validate that all legacy patterns have been removed from the codebase. Each test corresponds to a correctness property from the design document.

**Running the tests:**
```bash
npm test -- tests/cleanup-validation/cleanup-properties.test.js
```

## Cleanup Validator Script

The `scripts/cleanup-validator.js` script provides a CLI interface for the cleanup validation framework.

### Commands

#### Scan for Legacy Patterns
```bash
node scripts/cleanup-validator.js scan
```
Scans the entire codebase for legacy patterns and reports findings.

#### Create Checkpoint
```bash
node scripts/cleanup-validator.js checkpoint "Phase description"
```
Creates a git checkpoint commit with the specified message.

#### Create Pre-Cleanup Checkpoint
```bash
node scripts/cleanup-validator.js pre-cleanup
```
Creates a backup branch and checkpoint before starting cleanup.

#### Show Git Status
```bash
node scripts/cleanup-validator.js status
```
Shows current git status and recent commits.

#### Run Property Tests
```bash
node scripts/cleanup-validator.js test
```
Runs the property-based tests.

#### Full Validation
```bash
node scripts/cleanup-validator.js full
```
Runs complete validation: status + scan + tests.

## Workflow

### Recommended Cleanup Workflow

1. **Create Pre-Cleanup Checkpoint**
   ```bash
   node scripts/cleanup-validator.js pre-cleanup
   ```
   This creates a backup branch and checkpoint before starting.

2. **Scan for Legacy Patterns**
   ```bash
   node scripts/cleanup-validator.js scan
   ```
   This shows all files that need cleanup.

3. **Perform Cleanup Phase**
   - Remove legacy code according to the task list
   - Update references to use new methods
   - Run tests to ensure functionality

4. **Create Phase Checkpoint**
   ```bash
   node scripts/cleanup-validator.js checkpoint "Completed model cleanup"
   ```
   This creates a checkpoint after each major phase.

5. **Validate Cleanup**
   ```bash
   node scripts/cleanup-validator.js full
   ```
   This runs complete validation to ensure cleanup is successful.

6. **Repeat Steps 3-5** for each cleanup phase

## Property Tests

The framework includes 11 property tests that validate:

1. **Property 1**: Model methods are standardized (no @deprecated, no legacy isDuplicate)
2. **Property 2**: Route files contain no backward compatibility markers
3. **Property 3**: Validation files contain no legacy markers
4. **Property 4**: Address validation accepts only object format
5. **Property 5**: Service files contain no compatibility markers
6. **Property 6**: Model definitions contain no legacy field markers
7. **Property 7**: Code files contain no legacy TODO/FIXME comments
8. **Property 8**: Test files use standardized method names
9. **Property 9**: Route documentation is current
10. **Property 10**: Error messages are consistent
11. **Property 11**: Performance utilities contain no compatibility code

## Legacy Pattern Detection

The framework detects the following legacy patterns:

### Model Patterns
- `@deprecated` annotations
- `static async isDuplicate(` methods
- "Legacy fields" comments
- Commented legacy field definitions

### Route Patterns
- "Legacy route" comments
- "DEPRECATED" markers
- "backward compatibility" references
- "temporarily kept" comments
- "gradually migrating" comments

### Validation Patterns
- "Legacy validation" comments
- "to be removed when migration" comments
- "STUB" markers
- Legacy validation schemas

### Service Patterns
- "Re-export file for backward compatibility" comments
- `getExamAssignments` method references
- `updateExpiredPatients` method references
- "compatibility method" comments

### TODO/FIXME Patterns
- "TODO.*legacy" comments
- "TODO.*remove" comments
- "FIXME.*backward" comments
- "FIXME.*compatibility" comments

## Rollback Strategy

If cleanup causes issues:

1. **Check Recent Commits**
   ```bash
   node scripts/cleanup-validator.js status
   ```

2. **Rollback to Checkpoint**
   ```javascript
   const GitCheckpoint = require('./tests/utils/gitCheckpoint');
   const checkpoint = new GitCheckpoint();
   checkpoint.rollbackToCommit('commit-hash');
   ```

3. **Or Switch to Backup Branch**
   ```bash
   git checkout backup-before-cleanup-<timestamp>
   ```

## Integration with Task List

This framework supports the implementation of tasks in `.kiro/specs/remove-backward-compatibility/tasks.md`:

- **Task 1**: Set up cleanup validation framework ✅ (This framework)
- **Task 1.1-1.3**: Property tests for validation
- **Tasks 2-12**: Use the framework to validate cleanup progress

## Notes

- The framework is designed to be non-destructive - it only scans and validates
- All cleanup operations should be done manually or through other tools
- Always create checkpoints before major cleanup phases
- Run property tests frequently to catch issues early
- The framework works best when used incrementally throughout the cleanup process
