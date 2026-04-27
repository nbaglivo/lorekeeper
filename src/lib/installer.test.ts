import { describe, it, expect, vi, beforeEach } from 'vitest';
import { homedir } from 'os';
import { installSkill } from './installer.js';
import type { RemoteFile } from './github.js';

vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}));

import { mkdir, writeFile } from 'fs/promises';

const mockedMkdir = vi.mocked(mkdir);
const mockedWriteFile = vi.mocked(writeFile);

function skillFile(compatibility: string | null, extra?: Record<string, string>): RemoteFile[] {
  const frontmatter =
    compatibility === null
      ? `---\nname: test-skill\ndescription: A test skill\n---`
      : `---\nname: test-skill\ndescription: A test skill\ncompatibility: ${compatibility}\n---`;

  const skillMd = `${frontmatter}\n\n# Test Skill`;

  const files: RemoteFile[] = [
    { name: 'SKILL.md', path: `skills/test-skill/SKILL.md`, content: skillMd },
  ];

  if (extra) {
    for (const [name, content] of Object.entries(extra)) {
      files.push({ name, path: `skills/test-skill/${name}`, content });
    }
  }

  return files;
}

describe('installSkill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedMkdir.mockResolvedValue(undefined as any);
    mockedWriteFile.mockResolvedValue(undefined as any);
    vi.spyOn(process, 'cwd').mockReturnValue('/project');
  });

  describe('install destinations', () => {
    it('installs to .claude/skills for claude-code compatibility', async () => {
      const { destinations } = await installSkill('test-skill', skillFile('claude-code'));

      expect(destinations).toEqual(['/project/.claude/skills/test-skill']);
      expect(mockedMkdir).toHaveBeenCalledWith('/project/.claude/skills/test-skill', { recursive: true });
    });

    it('installs to .cursor/skills for cursor compatibility', async () => {
      const { destinations } = await installSkill('test-skill', skillFile('cursor'));

      expect(destinations).toEqual(['/project/.cursor/skills/test-skill']);
      expect(mockedMkdir).toHaveBeenCalledWith('/project/.cursor/skills/test-skill', { recursive: true });
    });

    it('installs to both destinations for "both" compatibility', async () => {
      const { destinations } = await installSkill('test-skill', skillFile('both'));

      expect(destinations).toHaveLength(2);
      expect(destinations).toContain('/project/.claude/skills/test-skill');
      expect(destinations).toContain('/project/.cursor/skills/test-skill');
      expect(mockedMkdir).toHaveBeenCalledTimes(2);
    });
  });

  describe('global flag', () => {
    it('installs to ~/.claude/skills when global and claude-code', async () => {
      const { destinations } = await installSkill('test-skill', skillFile('claude-code'), { global: true });

      expect(destinations).toEqual([`${homedir()}/.claude/skills/test-skill`]);
    });

    it('installs to ~/.cursor/skills when global and cursor', async () => {
      const { destinations } = await installSkill('test-skill', skillFile('cursor'), { global: true });

      expect(destinations).toEqual([`${homedir()}/.cursor/skills/test-skill`]);
    });

    it('installs to both home directories when global and both', async () => {
      const { destinations } = await installSkill('test-skill', skillFile('both'), { global: true });

      expect(destinations).toContain(`${homedir()}/.claude/skills/test-skill`);
      expect(destinations).toContain(`${homedir()}/.cursor/skills/test-skill`);
    });

    it('uses project paths when global is not set', async () => {
      const { destinations } = await installSkill('test-skill', skillFile('claude-code'));

      expect(destinations).toEqual(['/project/.claude/skills/test-skill']);
    });
  });

  describe('file writing', () => {
    it('writes all files to the destination directory', async () => {
      const files = skillFile('claude-code', { 'guide.md': '# Guide', 'example.ts': 'const x = 1' });

      await installSkill('test-skill', files);

      expect(mockedWriteFile).toHaveBeenCalledWith(
        '/project/.claude/skills/test-skill/SKILL.md',
        expect.any(String),
        'utf-8'
      );
      expect(mockedWriteFile).toHaveBeenCalledWith(
        '/project/.claude/skills/test-skill/guide.md',
        '# Guide',
        'utf-8'
      );
      expect(mockedWriteFile).toHaveBeenCalledWith(
        '/project/.claude/skills/test-skill/example.ts',
        'const x = 1',
        'utf-8'
      );
    });

    it('writes all files to every destination when compatibility is "both"', async () => {
      await installSkill('test-skill', skillFile('both', { 'extra.md': '# Extra' }));

      const writeCalls = mockedWriteFile.mock.calls.map((c) => c[0] as string);
      const claudeCalls = writeCalls.filter((p) => p.includes('.claude'));
      const cursorCalls = writeCalls.filter((p) => p.includes('.cursor'));

      expect(claudeCalls).toHaveLength(2);
      expect(cursorCalls).toHaveLength(2);
    });
  });

  describe('metadata', () => {
    it('returns the parsed skill metadata', async () => {
      const { meta } = await installSkill('test-skill', skillFile('cursor'));

      expect(meta.name).toBe('test-skill');
      expect(meta.description).toBe('A test skill');
      expect(meta.compatibility).toBe('cursor');
    });
  });

  describe('compatibility fallback', () => {
    it('defaults to "both" and returns a warning when compatibility is an unknown value', async () => {
      const { destinations, warning } = await installSkill('test-skill', skillFile('vscode'));

      expect(destinations).toHaveLength(2);
      expect(warning).toMatch(/unknown compatibility "vscode"/i);
    });

    it('defaults to "both" and returns a warning when compatibility is missing', async () => {
      const { destinations, warning } = await installSkill('test-skill', skillFile(null));

      expect(destinations).toHaveLength(2);
      expect(warning).toMatch(/no compatibility field/i);
    });

    it('returns no warning when compatibility is valid', async () => {
      const { warning } = await installSkill('test-skill', skillFile('cursor'));

      expect(warning).toBeUndefined();
    });
  });

  describe('error cases', () => {
    it('throws when SKILL.md is missing from the file list', async () => {
      const files: RemoteFile[] = [
        { name: 'other.md', path: 'skills/test-skill/other.md', content: '# Other' },
      ];

      await expect(installSkill('test-skill', files)).rejects.toThrow('SKILL.md not found');
    });
  });
});
