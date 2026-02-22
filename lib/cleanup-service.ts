import { cleanupExpiredSessions, initTempDirectory } from "@/lib/temp-manager";

/**
 * Cleanup service that runs periodically to remove expired session folders
 */
class CleanupService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

  async start() {
    console.log("Starting cleanup service...");

    // Initialize temp directory
    await initTempDirectory();

    // Run cleanup immediately
    await this.runCleanup();

    // Schedule periodic cleanup
    this.intervalId = setInterval(() => {
      this.runCleanup();
    }, this.CLEANUP_INTERVAL);

    console.log(
      `Cleanup service started (interval: ${this.CLEANUP_INTERVAL / 1000}s)`,
    );
  }

  async runCleanup() {
    try {
      console.log("Running cleanup...");
      await cleanupExpiredSessions();
      console.log("Cleanup completed");
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("Cleanup service stopped");
    }
  }
}

export const cleanupService = new CleanupService();

// Start cleanup service when module is loaded (server-side only)
if (typeof window === "undefined") {
  cleanupService.start();
}
