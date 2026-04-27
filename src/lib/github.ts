import { execa } from 'execa';

export async function isGhInstalled(): Promise<boolean> {
  try {
    await execa('gh', ['--version']);
    return true;
  } catch {
    return false;
  }
}

export async function isGhAuthenticated(): Promise<boolean> {
  try {
    await execa('gh', ['auth', 'status']);
    return true;
  } catch {
    return false;
  }
}

export interface RemoteFile {
  name: string;
  path: string;
  content: string;
}

export interface SkillEntry {
  name: string;
  skillMdContent: string | null;
  source: 'repo' | 'lore';
  loreUrl?: string;
}

interface GhContentItem {
  type: 'file' | 'dir';
  name: string;
  path: string;
}

interface GhFileResponse {
  content: string;
  encoding: string;
}

function decodeBase64Content(json: string): string {
  const fileData: GhFileResponse = JSON.parse(json);
  return Buffer.from(fileData.content.replace(/\s/g, ''), 'base64').toString('utf-8');
}

async function fetchFilesFromDir(repo: string, dirPath: string): Promise<RemoteFile[]> {
  const { stdout: dirJson } = await execa('gh', [
    'api',
    `repos/${repo}/contents/${dirPath}`,
  ]);

  const items: GhContentItem[] = JSON.parse(dirJson);
  const files: RemoteFile[] = [];

  for (const item of items.filter((i) => i.type === 'file')) {
    const { stdout: fileJson } = await execa('gh', [
      'api',
      `repos/${repo}/contents/${item.path}`,
    ]);
    files.push({ name: item.name, path: item.path, content: decodeBase64Content(fileJson) });
  }

  return files;
}

export async function fetchSkillFiles(repo: string, skillName: string): Promise<RemoteFile[]> {
  return fetchFilesFromDir(repo, `skills/${skillName}`);
}

export async function fetchSkillFilesFromPath(repo: string, path: string): Promise<RemoteFile[]> {
  return fetchFilesFromDir(repo, path);
}

export async function fetchSkillEntries(repo: string): Promise<SkillEntry[]> {
  const { stdout: dirJson } = await execa('gh', [
    'api',
    `repos/${repo}/contents/skills`,
  ]);

  const items: GhContentItem[] = JSON.parse(dirJson);
  const skillDirs = items.filter((item) => item.type === 'dir');

  const entries: SkillEntry[] = [];

  for (const dir of skillDirs) {
    try {
      const { stdout: fileJson } = await execa('gh', [
        'api',
        `repos/${repo}/contents/${dir.path}/SKILL.md`,
      ]);
      entries.push({ name: dir.name, skillMdContent: decodeBase64Content(fileJson), source: 'repo' });
    } catch {
      entries.push({ name: dir.name, skillMdContent: null, source: 'repo' });
    }
  }

  try {
    const { stdout: loreJson } = await execa('gh', [
      'api',
      `repos/${repo}/contents/skills/lore.json`,
    ]);
    const loreConfig = JSON.parse(decodeBase64Content(loreJson)) as { skills?: Record<string, string> };
    if (loreConfig.skills) {
      for (const [name, url] of Object.entries(loreConfig.skills)) {
        entries.push({ name, skillMdContent: null, source: 'lore', loreUrl: url });
      }
    }
  } catch {
    // lore.json is optional
  }

  return entries;
}
