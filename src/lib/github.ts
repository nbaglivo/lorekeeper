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
