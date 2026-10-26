import { spawn } from 'node:child_process';

/**
 * Deploys the site using the wrangler CLI.
 */
export class WranglerDeploy {
  /**
   * @param args Extra arguments passed to `wrangler deploy`.
   * @param log Logging function.
   */
  constructor(
    private readonly args: string[] = [],
    private readonly log: (msg: string) => void = () => {},
  ) {}

  /**
   * Runs the wrangler deploy command.
   */
  run(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.log('Deploying with wrangler...');
      const child = spawn('npx', ['--no-install', 'wrangler', 'deploy', ...this.args], {
        stdio: 'inherit',
        shell: process.platform === 'win32',
      });
      child.on('error', reject);
      child.on('exit', (code) =>
        code === 0
          ? (this.log('Deploy complete'), resolve())
          : reject(new Error(`wrangler exited with code ${code}`)),
      );
    });
  }
}
