import { execa } from 'execa';

export interface LoreConfig {
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

export function parseGitHubSkillUrl(url: string): { repo: string; path: string } {
  const match = /^https:\/\/github\.com\/([^/]+\/[^/]+)\/tree\/[^/]+\/(.+)$/.exec(url);
  if (!match) {
    throw new Error(
      `Invalid GitHub skill URL: "${url}"\nExpected: https://github.com/owner/repo/tree/branch/path/to/skill`
    );
  }
  return { repo: match[1], path: match[2] };
}
