/**
 * Environment-aware Logger Utility
 *
 * Supports:
 * - Environments: 'development' | 'production'
 * - Log Levels: 'verbose' (highly detailed) | 'normal' (concise / minimal / ok)
 */

export type Environment = 'development' | 'production';
export type LogLevel = 'verbose' | 'normal';

import fs from 'node:fs';
import path from 'node:path';

class Logger {
  private env: Environment;
  private level: LogLevel;
  private logDirectory: string | null = null;

  constructor() {
    this.env = (process.env.NODE_ENV as Environment) || 'development';
    const rawLevel = process.env.LOG_LEVEL?.toLowerCase();
    this.level =
      rawLevel === 'verbose' || rawLevel === 'detailed' || rawLevel === '-v' ? 'verbose' : 'normal';
    if (this.env === 'production') {
      for (const directory of [process.env.LOG_DIR || '/var/log/lms', '/tmp/sikshya-lms-logs']) {
        try {
          fs.mkdirSync(directory, { recursive: true });
          fs.accessSync(directory, fs.constants.W_OK);
          this.logDirectory = directory;
          break;
        } catch {
          /* Try the next safe location. */
        }
      }
      this.rotateLogs();
    }
  }

  private rotateLogs() {
    if (!this.logDirectory) return;
    const active = path.join(this.logDirectory, 'app.log');
    try {
      if (fs.existsSync(active)) {
        const modified = fs.statSync(active).mtime.toISOString().slice(0, 10);
        const today = new Date().toISOString().slice(0, 10);
        if (modified !== today)
          fs.renameSync(active, path.join(this.logDirectory, `app-${modified}.log`));
      }
      const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
      for (const file of fs.readdirSync(this.logDirectory)) {
        if (
          /^app-\d{4}-\d{2}-\d{2}\.log$/.test(file) &&
          fs.statSync(path.join(this.logDirectory, file)).mtimeMs < cutoff
        ) {
          fs.unlinkSync(path.join(this.logDirectory, file));
        }
      }
    } catch {
      /* Logging must never stop the application. */
    }
  }

  private write(level: string, message: string, details?: unknown) {
    if (!this.logDirectory) return;
    try {
      fs.appendFileSync(
        path.join(this.logDirectory, 'app.log'),
        `${JSON.stringify({ timestamp: this.getTimestamp(), level, message, details })}\n`,
      );
    } catch {
      /* Console logging remains available. */
    }
  }

  public getEnvironment(): Environment {
    return this.env;
  }

  public getLogLevel(): LogLevel {
    return this.level;
  }

  public isVerbose(): boolean {
    return this.level === 'verbose';
  }

  public isDev(): boolean {
    return this.env === 'development';
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * General info / OK log
   * In normal mode: Concise 1-liner
   * In verbose mode: Timed, styled 1-liner with details
   */
  public info(message: string, details?: any) {
    this.write('info', message, details);
    const prefix = `[${this.getTimestamp()}] [${this.env.toUpperCase()}:${this.level.toUpperCase()}] [INFO]`;
    if (this.isVerbose() && details !== undefined) {
      console.log(`\x1b[36m${prefix} ${message}\x1b[0m`, JSON.stringify(details, null, 2));
    } else {
      console.log(`\x1b[32m[OK]\x1b[0m ${message}`);
    }
  }

  /**
   * Alias for info log
   */
  public log(message: string, details?: any) {
    this.info(message, details);
  }

  /**
   * Verbose log - only outputs when LOG_LEVEL is 'verbose'
   */
  public debug(message: string, details?: any) {
    if (!this.isVerbose()) return;
    const prefix = `[${this.getTimestamp()}] [DEBUG]`;
    console.log(`\x1b[35m${prefix} ${message}\x1b[0m`);
    if (details !== undefined) {
      console.dir(details, { depth: null, colors: true });
    }
  }

  /**
   * HTTP Request Logging Middleware for Express
   */
  public httpMiddleware() {
    return (req: any, res: any, next: () => void) => {
      const startTime = Date.now();
      const { method, url, body, headers, ip } = req;

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        const statusColor =
          statusCode >= 400 ? '\x1b[31m' : statusCode >= 300 ? '\x1b[33m' : '\x1b[32m';

        if (this.isVerbose()) {
          // Highly Detailed Log Mode
          console.log('\n------------------- HTTP REQUEST DETAILED LOG -------------------');
          console.log(`Timestamp : ${this.getTimestamp()}`);
          console.log(`Method    : ${method}`);
          console.log(`URL       : ${url}`);
          console.log(`Status    : ${statusColor}${statusCode}\x1b[0m`);
          console.log(`Duration  : ${duration}ms`);
          console.log(`Client IP : ${ip || req.socket.remoteAddress}`);
          console.log(
            `Headers   :`,
            JSON.stringify({
              'user-agent': headers['user-agent'],
              'content-type': headers['content-type'],
              accept: headers['accept'],
            }),
          );
          if (body && Object.keys(body).length > 0) {
            console.log(`Body      :`, JSON.stringify(body, null, 2));
          }
          console.log('-----------------------------------------------------------------\n');
        } else {
          // Normal / Minimal "OK" Log Mode
          console.log(`${statusColor}[OK]\x1b[0m ${method} ${url} ${statusCode} - ${duration}ms`);
        }
      });

      next();
    };
  }

  public warn(message: string, details?: any) {
    this.write('warn', message, details);
    const prefix = `[${this.getTimestamp()}] [WARN]`;
    console.warn(`\x1b[33m${prefix} ${message}\x1b[0m`);
    if (this.isVerbose() && details !== undefined) {
      console.warn(details);
    }
  }

  public error(message: string, error?: any) {
    this.write(
      'error',
      message,
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error,
    );
    const prefix = `[${this.getTimestamp()}] [ERROR]`;
    console.error(`\x1b[31m${prefix} ${message}\x1b[0m`);
    if (error) {
      if (this.isVerbose()) {
        console.error(error.stack || error);
      } else {
        console.error(`\x1b[31m└─ Error: ${error.message || error}\x1b[0m`);
      }
    }
  }
}

export const logger = new Logger();
