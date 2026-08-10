/**
 * Universal Frontend Logger Utility
 */
class FrontendLogger {
  public log(message: string, details?: any) {
    if (details !== undefined) {
      console.log(`[OK] ${message}`, details);
    } else {
      console.log(`[OK] ${message}`);
    }
  }

  public info(message: string, details?: any) {
    if (details !== undefined) {
      console.info(`[INFO] ${message}`, details);
    } else {
      console.info(`[INFO] ${message}`);
    }
  }

  public warn(message: string, details?: any) {
    if (details !== undefined) {
      console.warn(`[WARN] ${message}`, details);
    } else {
      console.warn(`[WARN] ${message}`);
    }
  }

  public error(message: string, details?: any) {
    if (details !== undefined) {
      console.error(`[ERROR] ${message}`, details);
    } else {
      console.error(`[ERROR] ${message}`);
    }
  }
}

export const logger = new FrontendLogger();
