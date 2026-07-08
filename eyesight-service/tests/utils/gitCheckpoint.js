const { execSync } = require('child_process');
const path = require('path');

/**
 * GitCheckpoint utility for git operations
 * Used in cleanup validation tests
 */
class GitCheckpoint {
  constructor(repoPath = path.join(__dirname, '../../')) {
    this.repoPath = repoPath;
  }

  /**
   * Check if current directory is a git repository
   * @returns {boolean} True if in a git repository
   */
  isGitRepository() {
    try {
      execSync('git rev-parse --is-inside-work-tree', {
        cwd: this.repoPath,
        stdio: 'pipe',
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current git branch
   * @returns {string} Current branch name
   */
  getCurrentBranch() {
    const result = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: this.repoPath,
      encoding: 'utf8',
    });
    return result.trim();
  }

  /**
   * Get current git commit hash
   * @returns {string} Current commit hash (short)
   */
  getCurrentCommit() {
    const result = execSync('git rev-parse --short HEAD', {
      cwd: this.repoPath,
      encoding: 'utf8',
    });
    return result.trim();
  }

  /**
   * Get git status
   * @returns {string} Git status output
   */
  getGitStatus() {
    const result = execSync('git status --porcelain', {
      cwd: this.repoPath,
      encoding: 'utf8',
    });
    return result;
  }

  /**
   * Check if working directory is clean
   * @returns {boolean} True if no uncommitted changes
   */
  isClean() {
    const status = this.getGitStatus();
    return status.trim().length === 0;
  }
}

module.exports = GitCheckpoint;
