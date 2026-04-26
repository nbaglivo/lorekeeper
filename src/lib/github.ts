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

interface GhContentItem {
  type: 'file' | 'dir';
  name: string;
  path: string;
}

interface GhFileResponse {
  content: string;
  encoding: string;
}

export interface SkillEntry {
  name: string;
  skillMdContent: string | null;
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
      const fileData: GhFileResponse = JSON.parse(fileJson);
      const content = Buffer.from(fileData.content.replace(/\s/g, ''), 'base64').toString('utf-8');
      entries.push({ name: dir.name, skillMdContent: content });
    } catch {
      entries.push({ name: dir.name, skillMdContent: null });
    }
  }

  return entries;
}

export async function fetchSkillFiles(repo: string, skillName: string): Promise<RemoteFile[]> {
  const dirPath = `skills/${skillName}`;

  const { stdout: dirJson } = await execa('gh', [
    'api',
    `repos/${repo}/contents/${dirPath}`,
  ]);

  const items: GhContentItem[] = JSON.parse(dirJson);
  const fileItems = items.filter((item) => item.type === 'file');

  const files: RemoteFile[] = [];

  for (const item of fileItems) {
    const { stdout: fileJson } = await execa('gh', [
      'api',
      `repos/${repo}/contents/${item.path}`,
    ]);

    const fileData: GhFileResponse = JSON.parse(fileJson);
    const content = Buffer.from(fileData.content.replace(/\s/g, ''), 'base64').toString('utf-8');

    files.push({ name: item.name, path: item.path, content });
  }

  return files;
}
