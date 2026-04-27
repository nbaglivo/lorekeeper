import * as p from '@clack/prompts';
import { assertPreflight } from '../lib/preflight.js';
import { fetchSkillFiles, fetchSkillFilesFromPath, type RemoteFile } from '../lib/github.js';
import { installSkill, validateRemoteSkillMeta } from '../lib/installer.js';
import { fetchLoreConfig, parseGitHubSkillUrl } from '../lib/lore.js';

function isNotFound(err: unknown): boolean {
  const stderr = (err as { stderr?: string }).stderr ?? '';
  const message = (err as Error).message ?? '';
  return stderr.includes('Not Found') || message.includes('Not Found') || stderr.includes('404');
}

export async function addCommand(skillName: string, options: { global?: boolean } = {}): Promise<void> {
  p.intro(`Lorekeeper — add "${skillName}"${options.global ? ' (global)' : ''}`);

  const config = await assertPreflight();

  const spinner = p.spinner();
  spinner.start(`Fetching "${skillName}" from ${config.repo}`);

  let files!: RemoteFile[];
  let fromLore = false;
  let loreUrl: string | undefined;

  try {
    files = await fetchSkillFiles(config.repo, skillName);
    spinner.stop(`Fetched ${files.length} file(s) from ${config.repo}`);
  } catch (err: unknown) {
    if (!isNotFound(err)) {
      spinner.stop('Fetch failed');
      p.log.error((err as Error).message || 'Unknown error while fetching skill');
      process.exit(1);
    }

    spinner.message(`Not found in ${config.repo} — checking lore.json`);

    const lore = await fetchLoreConfig(config.repo);
    if (!lore?.skills[skillName]) {
      spinner.stop('Not found');
      p.log.error(`Skill "${skillName}" not found in ${config.repo} or lore.json.`);
      process.exit(1);
    }

    loreUrl = lore.skills[skillName];

    let parsed: { repo: string; path: string };
    try {
      parsed = parseGitHubSkillUrl(loreUrl);
    } catch (parseErr: unknown) {
      spinner.stop('Invalid lore.json URL');
      p.log.error((parseErr as Error).message);
      process.exit(1);
    }

    spinner.message(`Fetching "${skillName}" from ${parsed.repo} (via lore.json)`);

    try {
      files = await fetchSkillFilesFromPath(parsed.repo, parsed.path);
    } catch (fetchErr: unknown) {
      spinner.stop('Fetch failed');
      p.log.error(`Could not fetch from external source.\n${(fetchErr as Error).message ?? ''}`);
      process.exit(1);
    }

    try {
      validateRemoteSkillMeta(files);
    } catch (validErr: unknown) {
      spinner.stop('Validation failed');
      p.log.error(`External skill is invalid: ${(validErr as Error).message}`);
      process.exit(1);
    }

    spinner.stop(`Fetched ${files.length} file(s) via lore.json`);
    fromLore = true;
  }

  if (fromLore && loreUrl) {
    p.log.warn(`Installing from external source: ${loreUrl}`);
  }

  try {
    const { destinations, meta, warning } = await installSkill(skillName, files, options);
    if (warning) p.log.warn(warning);
    for (const dest of destinations) {
      p.log.success(`Installed → ${dest}`);
    }
    p.outro(
      `"${meta.name}" installed to ${destinations.length} target${destinations.length > 1 ? 's' : ''}.`
    );
  } catch (err: unknown) {
    p.log.error((err as Error).message ?? 'Failed to install skill');
    process.exit(1);
  }
}
