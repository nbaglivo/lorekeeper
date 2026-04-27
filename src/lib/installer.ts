import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import matter from 'gray-matter';
import type { RemoteFile } from './github.js';

export type Compatibility = 'claude-code' | 'cursor' | 'both';

export interface SkillMeta {
  name: string;
  description?: string;
  compatibility: Compatibility;
}

const VALID_COMPATIBILITY: Compatibility[] = ['claude-code', 'cursor', 'both'];

function parseSkillMeta(skillMdContent: string): { meta: SkillMeta; warning?: string } {
  const { data } = matter(skillMdContent);

  let compatibility = data.compatibility as Compatibility;
  let warning: string | undefined;

  if (!compatibility) {
    warning = 'No compatibility field found in SKILL.md — defaulting to "both".';
    compatibility = 'both';
  } else if (!VALID_COMPATIBILITY.includes(compatibility)) {
    warning = `Unknown compatibility "${compatibility}" in SKILL.md — defaulting to "both".`;
    compatibility = 'both';
  }

  return {
    meta: {
      name: data.name ?? 'unknown',
      description: data.description,
      compatibility,
    },
    warning,
  };
}

function getDestinations(compatibility: Compatibility, skillName: string, global: boolean): string[] {
  const base = global ? homedir() : process.cwd();
  const agents = join(base, '.agents', 'skills', skillName);
  if (compatibility === 'claude-code') {
    return [join(base, '.claude', 'skills', skillName), agents];
  }
  if (compatibility === 'cursor') {
    return [join(base, '.cursor', 'skills', skillName), agents];
  }
  return [
    join(base, '.claude', 'skills', skillName),
    join(base, '.cursor', 'skills', skillName),
    agents,
  ];
}

export async function installSkill(
  skillName: string,
  files: RemoteFile[],
  options: { global?: boolean } = {}
): Promise<{ destinations: string[]; meta: SkillMeta; warning?: string }> {
  const skillMd = files.find((f) => f.name === 'SKILL.md');
  if (!skillMd) {
    throw new Error('SKILL.md not found in the skill folder');
  }

  const { meta, warning } = parseSkillMeta(skillMd.content);
  const destinations = getDestinations(meta.compatibility, skillName, options.global ?? false);

  for (const destDir of destinations) {
    await mkdir(destDir, { recursive: true });
    for (const file of files) {
      await writeFile(join(destDir, file.name), file.content, 'utf-8');
    }
  }

  return { destinations, meta, warning };
}
