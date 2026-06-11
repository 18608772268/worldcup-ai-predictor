type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private log(level: LogLevel, message: string, meta?: any) {
    const ts = new Date().toISOString();
    const prefix = `[${ts}] [${level.toUpperCase()}]`;
    const out = meta ? `${prefix} ${message} ${JSON.stringify(meta)}` : `${prefix} ${message}`;
    if (level === 'error') console.error(out);
    else if (level === 'warn') console.warn(out);
    else console.log(out);
  }

  info(message: string, meta?: any) {
    this.log('info', message, meta);
  }
  warn(message: string, meta?: any) {
    this.log('warn', message, meta);
  }
  error(message: string, meta?: any) {
    this.log('error', message, meta);
  }
  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV !== 'production') this.log('debug', message, meta);
  }
}

export const logger = new Logger();
