import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
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

function getDestinations(compatibility: Compatibility, skillName: string): string[] {
  const cwd = process.cwd();
  if (compatibility === 'claude-code') {
    return [join(cwd, '.claude', 'skills', skillName)];
  }
  if (compatibility === 'cursor') {
    return [join(cwd, '.cursor', 'skills', skillName)];
  }
  return [
    join(cwd, '.claude', 'skills', skillName),
    join(cwd, '.cursor', 'skills', skillName),
  ];
}

export async function installSkill(
  skillName: string,
  files: RemoteFile[]
): Promise<{ destinations: string[]; meta: SkillMeta; warning?: string }> {
  const skillMd = files.find((f) => f.name === 'SKILL.md');
  if (!skillMd) {
    throw new Error('SKILL.md not found in the skill folder');
  }

  const { meta, warning } = parseSkillMeta(skillMd.content);
  const destinations = getDestinations(meta.compatibility, skillName);

  for (const destDir of destinations) {
    await mkdir(destDir, { recursive: true });
    for (const file of files) {
      await writeFile(join(destDir, file.name), file.content, 'utf-8');
    }
  }

  return { destinations, meta, warning };
}
