import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isGhInstalled, isGhAuthenticated, fetchSkillFiles, fetchSkillFilesFromPath, fetchSkillEntries } from './github.js';

vi.mock('execa', () => ({
  execa: vi.fn(),
}));

import { execa } from 'execa';

const mockedExeca = vi.mocked(execa);

function makeFileResponse(content: string) {
  return {
    stdout: JSON.stringify({
      content: Buffer.from(content).toString('base64'),
      encoding: 'base64',
    }),
  };
}

const loreNotFound = () =>
  mockedExeca.mockRejectedValueOnce(
    Object.assign(new Error('Not Found'), { stderr: 'Not Found (HTTP 404)' })
  );

describe('isGhInstalled', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns true when gh is installed', async () => {
    mockedExeca.mockResolvedValueOnce({ stdout: 'gh version 2.0.0' } as any);
    expect(await isGhInstalled()).toBe(true);
  });

  it('returns false when gh is not installed', async () => {
    mockedExeca.mockRejectedValueOnce(new Error('command not found: gh'));
    expect(await isGhInstalled()).toBe(false);
  });
});

describe('isGhAuthenticated', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns true when gh has an active session', async () => {
    mockedExeca.mockResolvedValueOnce({ stdout: '' } as any);
    expect(await isGhAuthenticated()).toBe(true);
  });

  it('returns false when gh is not authenticated', async () => {
    mockedExeca.mockRejectedValueOnce(new Error('not logged into any GitHub hosts'));
    expect(await isGhAuthenticated()).toBe(false);
  });
});

describe('fetchSkillEntries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns repo entries with source: "repo"', async () => {
    const skillsListing = [
      { type: 'dir', name: 'code-review', path: 'skills/code-review' },
      { type: 'dir', name: 'typescript', path: 'skills/typescript' },
    ];

    mockedExeca
      .mockResolvedValueOnce({ stdout: JSON.stringify(skillsListing) } as any)
      .mockResolvedValueOnce(makeFileResponse('# Code Review') as any)
      .mockResolvedValueOnce(makeFileResponse('# TypeScript') as any);
    loreNotFound();

    const entries = await fetchSkillEntries('acme-org/skills');

    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({ name: 'code-review', skillMdContent: '# Code Review', source: 'repo' });
    expect(entries[1]).toEqual({ name: 'typescript', skillMdContent: '# TypeScript', source: 'repo' });
  });

  it('skips file entries at the skills root level', async () => {
    const skillsListing = [
      { type: 'dir', name: 'code-review', path: 'skills/code-review' },
      { type: 'file', name: 'README.md', path: 'skills/README.md' },
    ];

    mockedExeca
      .mockResolvedValueOnce({ stdout: JSON.stringify(skillsListing) } as any)
      .mockResolvedValueOnce(makeFileResponse('# Code Review') as any);
    loreNotFound();

    const entries = await fetchSkillEntries('acme-org/skills');
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('code-review');
  });

  it('sets skillMdContent to null when SKILL.md is missing', async () => {
    const skillsListing = [{ type: 'dir', name: 'broken-skill', path: 'skills/broken-skill' }];

    mockedExeca
      .mockResolvedValueOnce({ stdout: JSON.stringify(skillsListing) } as any)
      .mockRejectedValueOnce(Object.assign(new Error('Not Found'), { stderr: 'Not Found (HTTP 404)' }));
    loreNotFound();

    const entries = await fetchSkillEntries('acme-org/skills');
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({ name: 'broken-skill', skillMdContent: null, source: 'repo' });
  });

  it('calls the API with the correct paths', async () => {
    const skillsListing = [{ type: 'dir', name: 'auth', path: 'skills/auth' }];

    mockedExeca
      .mockResolvedValueOnce({ stdout: JSON.stringify(skillsListing) } as any)
      .mockResolvedValueOnce(makeFileResponse('content') as any);
    loreNotFound();

    await fetchSkillEntries('my-org/my-repo');

    expect(mockedExeca).toHaveBeenNthCalledWith(1, 'gh', ['api', 'repos/my-org/my-repo/contents/skills']);
    expect(mockedExeca).toHaveBeenNthCalledWith(2, 'gh', ['api', 'repos/my-org/my-repo/contents/skills/auth/SKILL.md']);
    expect(mockedExeca).toHaveBeenNthCalledWith(3, 'gh', ['api', 'repos/my-org/my-repo/contents/skills/lore.json']);
  });

  it('returns lore entries with source: "lore" when lore.json exists', async () => {
    const skillsListing: never[] = [];
    const loreConfig = {
      skills: { 'external-skill': 'https://github.com/org/agent-skills' },
    };
    const loreContent = Buffer.from(JSON.stringify(loreConfig)).toString('base64');

    mockedExeca
      .mockResolvedValueOnce({ stdout: JSON.stringify(skillsListing) } as any)
      .mockResolvedValueOnce({
        stdout: JSON.stringify({ content: loreContent, encoding: 'base64' }),
      } as any);

    const entries = await fetchSkillEntries('acme-org/skills');

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      name: 'external-skill',
      skillMdContent: null,
      source: 'lore',
      loreUrl: 'https://github.com/org/agent-skills',
    });
  });

  it('returns both repo and lore entries when both are present', async () => {
    const skillsListing = [{ type: 'dir', name: 'local-skill', path: 'skills/local-skill' }];
    const loreConfig = { skills: { 'remote-skill': 'https://github.com/org/agent-skills' } };
    const loreContent = Buffer.from(JSON.stringify(loreConfig)).toString('base64');

    mockedExeca
      .mockResolvedValueOnce({ stdout: JSON.stringify(skillsListing) } as any)
      .mockResolvedValueOnce(makeFileResponse('# Local') as any)
      .mockResolvedValueOnce({ stdout: JSON.stringify({ content: loreContent, encoding: 'base64' }) } as any);

    const entries = await fetchSkillEntries('acme-org/skills');

    expect(entries).toHaveLength(2);
    expect(entries.filter((e) => e.source === 'repo')).toHaveLength(1);
    expect(entries.filter((e) => e.source === 'lore')).toHaveLength(1);
  });
});

describe('fetchSkillFiles', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches and decodes all files in the skill directory', async () => {
    const dirListing = [
      { type: 'file', name: 'SKILL.md', path: 'skills/my-skill/SKILL.md' },
      { type: 'file', name: 'extra.md', path: 'skills/my-skill/extra.md' },
    ];

    mockedExeca
      .mockResolvedValueOnce({ stdout: JSON.stringify(dirListing) } as any)
      .mockResolvedValueOnce(makeFileResponse('# Skill content') as any)
      .mockResolvedValueOnce(makeFileResponse('# Extra content') as any);

    const files = await fetchSkillFiles('acme-org/skills', 'my-skill');

    expect(files).toHaveLength(2);
    expect(files[0]).toEqual({ name: 'SKILL.md', path: 'skills/my-skill/SKILL.md', content: '# Skill content' });
    expect(files[1]).toEqual({ name: 'extra.md', path: 'skills/my-skill/extra.md', content: '# Extra content' });
  });

  it('skips directory entries in the listing', async () => {
    const dirListing = [
      { type: 'file', name: 'SKILL.md', path: 'skills/my-skill/SKILL.md' },
      { type: 'dir', name: 'examples', path: 'skills/my-skill/examples' },
    ];

    mockedExeca
      .mockResolvedValueOnce({ stdout: JSON.stringify(dirListing) } as any)
      .mockResolvedValueOnce(makeFileResponse('# Skill') as any);

    const files = await fetchSkillFiles('acme-org/skills', 'my-skill');
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('SKILL.md');
  });

  it('correctly strips newlines from base64-encoded content (GitHub API format)', async () => {
    const original = 'a'.repeat(200);
    const base64WithNewlines = Buffer.from(original).toString('base64').match(/.{1,76}/g)!.join('\n');

    mockedExeca
      .mockResolvedValueOnce({ stdout: JSON.stringify([{ type: 'file', name: 'SKILL.md', path: 'skills/s/SKILL.md' }]) } as any)
      .mockResolvedValueOnce({ stdout: JSON.stringify({ content: base64WithNewlines, encoding: 'base64' }) } as any);

    const files = await fetchSkillFiles('acme-org/skills', 's');
    expect(files[0].content).toBe(original);
  });

  it('calls the GitHub API with the correct repo and path', async () => {
    mockedExeca
      .mockResolvedValueOnce({ stdout: JSON.stringify([{ type: 'file', name: 'SKILL.md', path: 'skills/auth/SKILL.md' }]) } as any)
      .mockResolvedValueOnce(makeFileResponse('content') as any);

    await fetchSkillFiles('my-org/my-repo', 'auth');

    expect(mockedExeca).toHaveBeenNthCalledWith(1, 'gh', ['api', 'repos/my-org/my-repo/contents/skills/auth']);
    expect(mockedExeca).toHaveBeenNthCalledWith(2, 'gh', ['api', 'repos/my-org/my-repo/contents/skills/auth/SKILL.md']);
  });
});

describe('fetchSkillFilesFromPath', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches files using the provided path directly', async () => {
    const dirListing = [{ type: 'file', name: 'SKILL.md', path: 'custom/path/SKILL.md' }];

    mockedExeca
      .mockResolvedValueOnce({ stdout: JSON.stringify(dirListing) } as any)
      .mockResolvedValueOnce(makeFileResponse('# Custom') as any);

    const files = await fetchSkillFilesFromPath('org/repo', 'custom/path');

    expect(files).toHaveLength(1);
    expect(files[0].content).toBe('# Custom');
  });

  it('calls the API with the exact path given', async () => {
    mockedExeca
      .mockResolvedValueOnce({ stdout: JSON.stringify([{ type: 'file', name: 'SKILL.md', path: 'skills/ext-skill/SKILL.md' }]) } as any)
      .mockResolvedValueOnce(makeFileResponse('content') as any);

    await fetchSkillFilesFromPath('other-org/other-repo', 'skills/ext-skill');

    expect(mockedExeca).toHaveBeenNthCalledWith(1, 'gh', ['api', 'repos/other-org/other-repo/contents/skills/ext-skill']);
  });
});
