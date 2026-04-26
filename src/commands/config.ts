import * as p from '@clack/prompts';
import { readConfig, writeConfig, CONFIG_PATH } from '../lib/config.js';

export async function configCommand(): Promise<void> {
  p.intro('Lorekeeper — Config');

  const existing = await readConfig();

  const repo = await p.text({
    message: 'GitHub repository for skills (owner/repo)',
    placeholder: 'acme-org/skills',
    initialValue: existing?.repo ?? '',
    validate(value) {
      if (!/^[\w.-]+\/[\w.-]+$/.test(value.trim())) {
        return 'Must be in owner/repo format (e.g. acme-org/skills)';
      }
    },
  });

  if (p.isCancel(repo)) {
    p.cancel('Config cancelled.');
    process.exit(0);
  }

  await writeConfig({ repo: repo.trim() });

  p.outro(`Config saved → ${CONFIG_PATH}`);
}
