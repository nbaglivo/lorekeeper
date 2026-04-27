import { execa } from 'execa';

export interface LoreConfig {
  // key is the skill name, value is the URL to the skill repository
  skills: Record<string, string>;
}

interface GhFileResponse {
  content: string;
  encoding: string;
}

export async function fetchLoreConfig(repo: string): Promise<LoreConfig | null> {
  try {
    const { stdout } = await execa('gh', [
      'api',
      `repos/${repo}/contents/skills/lore.json`,
    ]);
    const fileData: GhFileResponse = JSON.parse(stdout);
    const content = Buffer.from(fileData.content.replace(/\s/g, ''), 'base64').toString('utf-8');
    return JSON.parse(content) as LoreConfig;
  } catch {
    return null;
  }
}

export function parseGitHubRepoUrl(url: string): string {
  const match = /^https:\/\/github\.com\/([^/]+\/[^/]+?)\/?$/.exec(url);
  if (!match) {
    throw new Error(
      `Invalid GitHub repo URL: "${url}"\nExpected: https://github.com/owner/repo`
    );
  }
  return match[1];
}
