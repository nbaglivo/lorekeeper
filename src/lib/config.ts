import { homedir } from 'os';
import { join } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';

const CONFIG_DIR = join(homedir(), '.lorekeeper');
export const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

export interface LorekeeperConfig {
  repo: string;
}

export async function readConfig(): Promise<LorekeeperConfig | null> {
  try {
    const content = await readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(content) as LorekeeperConfig;
  } catch {
    return null;
  }
}

export async function writeConfig(config: LorekeeperConfig): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}
