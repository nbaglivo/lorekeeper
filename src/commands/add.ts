import * as p from '@clack/prompts';
import { readConfig } from '../lib/config.js';
import { isGhInstalled, isGhAuthenticated, fetchSkillFiles } from '../lib/github.js';
import { installSkill } from '../lib/installer.js';

export async function addCommand(skillName: string): Promise<void> {
  p.intro(`Lorekeeper — add "${skillName}"`);

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
  spinner.start(`Fetching "${skillName}" from ${config.repo}`);

  let files;
  try {
    files = await fetchSkillFiles(config.repo, skillName);
  } catch (err: unknown) {
    spinner.stop('Fetch failed');
    const stderr = (err as { stderr?: string }).stderr ?? '';
    const message = (err as Error).message ?? '';
    if (stderr.includes('Not Found') || message.includes('Not Found') || stderr.includes('404')) {
      p.log.error(`Skill "${skillName}" not found in ${config.repo}.\nExpected path: skills/${skillName}/`);
    } else {
      p.log.error(message || 'Unknown error while fetching skill');
    }
    process.exit(1);
  }

  spinner.stop(`Fetched ${files.length} file(s)`);

  try {
    const { destinations, meta, warning } = await installSkill(skillName, files);
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
