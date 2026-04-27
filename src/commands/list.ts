import * as p from '@clack/prompts';
import matter from 'gray-matter';
import { readConfig } from '../lib/config.js';
import { isGhInstalled, isGhAuthenticated, fetchSkillEntries, type SkillEntry } from '../lib/github.js';

const truncate = (text: string, max = 60) =>
  text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;

function formatRepoEntry(entry: SkillEntry): string {
  if (!entry.skillMdContent) return entry.name;
  const { data } = matter(entry.skillMdContent);
  const name = data.name ?? entry.name;
  const compatibility = `[${data.compatibility ?? 'both'}]`;
  const description = data.description ? `\n  ${truncate(data.description)}` : '';
  return `${name} ${compatibility}${description}`;
}

function formatLoreEntry(entry: SkillEntry): string {
  return `${entry.name} [lore]\n  ${truncate(entry.loreUrl ?? '', 60)}`;
}

export async function listCommand(): Promise<void> {
  p.intro('Lorekeeper — Skills');

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

  const spinner = p.spinner();
  spinner.start(`Fetching skills from ${config.repo}`);

  let entries;
  try {
    entries = await fetchSkillEntries(config.repo);
  } catch (err: unknown) {
    spinner.stop('Failed to fetch skills');
    const stderr = (err as { stderr?: string }).stderr ?? '';
    const message = (err as Error).message ?? '';
    if (stderr.includes('Not Found') || message.includes('Not Found') || stderr.includes('404')) {
      p.log.error(`No skills directory found in ${config.repo}.\nExpected path: skills/`);
    } else {
      p.log.error(message || 'Unknown error while fetching skills');
    }
    process.exit(1);
  }

  const repoEntries = entries.filter((e) => e.source === 'repo');
  const loreEntries = entries.filter((e) => e.source === 'lore');
  const total = entries.length;

  spinner.stop(
    `Found ${repoEntries.length} skill${repoEntries.length !== 1 ? 's' : ''}` +
    (loreEntries.length > 0 ? `, ${loreEntries.length} via lore.json` : '')
  );

  if (total === 0) {
    p.log.info('No skills found in the repository.');
    p.outro('');
    return;
  }

  const sections: string[] = [];

  if (repoEntries.length > 0) {
    sections.push(repoEntries.map(formatRepoEntry).join('\n\n'));
  }

  if (loreEntries.length > 0) {
    sections.push(
      ['── via lore.json ' + '─'.repeat(20), loreEntries.map(formatLoreEntry).join('\n\n')].join('\n\n')
    );
  }

  p.note(sections.join('\n\n'), config.repo);
  p.outro('Run `lorekeeper add <skill-name>` to install a skill.');
}
