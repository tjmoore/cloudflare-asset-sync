// Debounced, single-flight deploy scheduler (no I/O; deploy fn is injected).
export interface DeployerOptions {
  deploy: () => Promise<void>;
  debounceMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  log?: (msg: string) => void;
}

export class Deployer {
  private readonly deploy: () => Promise<void>;
  private readonly debounceMs: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly log: (msg: string) => void;
  private timer: NodeJS.Timeout | null = null;
  private running: Promise<void> | null = null;
  private dirty = false;
  private stopped = false;

  constructor({ deploy, debounceMs = 5000, maxRetries = 3, retryDelayMs = 10000, log = () => {} }: DeployerOptions) {
    this.deploy = deploy;
    this.debounceMs = debounceMs;
    this.maxRetries = maxRetries;
    this.retryDelayMs = retryDelayMs;
    this.log = log;
  }

  // Called on every file change; restarts the quiet-period timer.
  notify(): void {
    if (this.stopped) return;
    this.dirty = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.kick(), this.debounceMs);
  }

  private kick(): void {
    this.timer = null;
    if (this.running || this.stopped) return; // follow-up is scheduled when current run ends
    this.running = this.run().finally(() => {
      this.running = null;
      if (this.dirty && !this.timer && !this.stopped) this.kick();
    });
  }

  private async run(): Promise<void> {
    this.dirty = false;
    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      try {
        await this.deploy();
        return;
      } catch (err) {
        this.log(`Deploy failed (attempt ${attempt}): ${err instanceof Error ? err.message : String(err)}`);
        if (attempt > this.maxRetries || this.stopped) return;
        await new Promise((r) => setTimeout(r, this.retryDelayMs * attempt));
      }
    }
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    await this.running;
  }
}
