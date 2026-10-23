/**
 * Options for configuring the Deployer.
 */
export interface DeployerOptions {
  /**
   * Function to execute the deployment.
   */
  deploy: () => Promise<void>;
  /**
   * Debounce interval in milliseconds.
   */
  debounceMs?: number;
  /**
   * Maximum number of retry attempts.
   */
  maxRetries?: number;
  /**
   * Delay between retry attempts in milliseconds.
   */
  retryDelayMs?: number;
  /**
   * Logging function for deployment messages.
   */
  log?: (msg: string) => void;
}

/**
 * Deployer handles debounced, single-flight deployment with retry logic.
 */
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

  /**
   * Creates a new Deployer instance.
   * @param options Configuration options for the deployer.
   */
  constructor({ deploy, debounceMs = 5000, maxRetries = 3, retryDelayMs = 10000, log = () => {} }: DeployerOptions) {
    this.deploy = deploy;
    this.debounceMs = debounceMs;
    this.maxRetries = maxRetries;
    this.retryDelayMs = retryDelayMs;
    this.log = log;
  }

  /**
   * Notifies the deployer of a file change, restarting the debounce timer.
   */
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

  /**
   * Stops the deployer, cancelling any pending deployments and waiting for the current one to finish.
   */
  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    await this.running;
  }
}
