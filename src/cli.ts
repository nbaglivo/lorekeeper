import { Command } from 'commander';
import { configCommand } from './commands/config.js';
import { addCommand } from './commands/add.js';
import { listCommand } from './commands/list.js';

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
    .option('--global', 'Install to ~/.claude/skills or ~/.cursor/skills instead of the current project')
    .action(addCommand);

  program
    .command('list')
    .description('List all available skills in the configured repository')
    .action(listCommand);

  return program;
}
