import { Command } from 'commander';
import { configCommand } from './commands/config.js';
import { addCommand } from './commands/add.js';

export function createCli(): Command {
  const program = new Command();

  program
    .name('lorekeeper')
    .description('Install private GitHub-hosted skills for Cursor and Claude Code')
    .version('1.0.0');

  program
    .command('config')
    .description('Set the GitHub repository to pull skills from')
    .action(configCommand);

  program
    .command('add <skill-name>')
    .description('Fetch and install a skill from the configured repository')
    .action(addCommand);

  return program;
}
