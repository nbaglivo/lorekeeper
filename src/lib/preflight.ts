import * as p from '@clack/prompts';
import { readConfig, type LorekeeperConfig } from './config.js';
import { isGhInstalled, isGhAuthenticated } from './github.js';

export async function assertPreflight(): Promise<LorekeeperConfig> {
  const config = await readConfig();
  if (!config) {
    p.log.error('No config found. Run `lorekeeper config` first.');
    process.exit(1);
  }

  if (!(await isGhInstalled())) {
    p.log.error('`gh` CLI is not installed. Get it at https://cli.github.com');
    process.exit(1);
  }

  if (!(await isGhAuthenticated())) {
    p.log.error('Not authenticated with GitHub. Run `gh auth login` first.');
    process.exit(1);
  }

  return config;
}
