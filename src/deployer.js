// Debounced, single-flight deploy scheduler (no I/O; deploy fn is injected).
export class Deployer {
  constructor({ deploy, debounceMs = 5000, maxRetries = 3, retryDelayMs = 10000, log = () => {} }) {
    this.deploy = deploy;
    this.debounceMs = debounceMs;
    this.maxRetries = maxRetries;
    this.retryDelayMs = retryDelayMs;
    this.log = log;
    this.timer = null;
    this.running = null;
    this.dirty = false;
    this.stopped = false;
  }

  // Called on every file change; restarts the quiet-period timer.
  notify() {
    if (this.stopped) return;
    this.dirty = true;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.#kick(), this.debounceMs);
  }

  #kick() {
    this.timer = null;
    if (this.running || this.stopped) return; // follow-up is scheduled when current run ends
    this.running = this.#run().finally(() => {
      this.running = null;
      if (this.dirty && !this.timer && !this.stopped) this.#kick();
    });
  }

  async #run() {
    this.dirty = false;
    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      try {
        await this.deploy();
        return;
      } catch (err) {
        this.log(`Deploy failed (attempt ${attempt}): ${err.message}`);
        if (attempt > this.maxRetries || this.stopped) return;
        await new Promise((r) => setTimeout(r, this.retryDelayMs * attempt));
      }
    }
  }

  async stop() {
    this.stopped = true;
    clearTimeout(this.timer);
    await this.running;
  }
}
