export const LogLevel = {
  error: "error",
  warn: "warn",
  info: "info",
  debug: "debug",
} as const;
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

type LoggerOptions = {
  namespace?: string;
  loglevel?: LogLevel;
};

export class Logger {
  private _loglevel: LogLevel;
  readonly namespace?: string;

  private static readonly _logLevelMap: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  };

  constructor(options?: LoggerOptions) {
    this._loglevel = options?.loglevel ?? "info";
    this.namespace = options?.namespace;
  }

  get loglevel() {
    return this._loglevel;
  }

  error(...args: unknown[]) {
    if (this._shouldLog("error")) {
      console.error(...this._formatMessage(args));
    }
  }

  warn(...args: unknown[]) {
    if (this._shouldLog("warn")) {
      console.warn(...this._formatMessage(args));
    }
  }

  info(...args: unknown[]) {
    if (this._shouldLog("info")) {
      console.info(...this._formatMessage(args));
    }
  }

  debug(...args: unknown[]) {
    if (this._shouldLog("debug")) {
      console.debug(...this._formatMessage(args));
    }
  }

  setLogLevel(level: LogLevel) {
    this._loglevel = level;
  }

  private _shouldLog(level: LogLevel): boolean {
    return Logger._logLevelMap[level] <= Logger._logLevelMap[this._loglevel];
  }

  private _formatMessage(args: unknown[]): unknown[] {
    if (this.namespace) {
      return [`[${this.namespace}]`, ...args];
    }
    return args;
  }
}
