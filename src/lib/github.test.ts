import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isGhInstalled, isGhAuthenticated, fetchSkillFiles } from './github.js';

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
    expect(files[0]).toEqual({
      name: 'SKILL.md',
      path: 'skills/my-skill/SKILL.md',
      content: '# Skill content',
    });
    expect(files[1]).toEqual({
      name: 'extra.md',
      path: 'skills/my-skill/extra.md',
      content: '# Extra content',
    });
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
    const base64WithNewlines = Buffer.from(original)
      .toString('base64')
      .match(/.{1,76}/g)!
      .join('\n');

    const dirListing = [{ type: 'file', name: 'SKILL.md', path: 'skills/s/SKILL.md' }];

    mockedExeca
      .mockResolvedValueOnce({ stdout: JSON.stringify(dirListing) } as any)
      .mockResolvedValueOnce({
        stdout: JSON.stringify({ content: base64WithNewlines, encoding: 'base64' }),
      } as any);

    const files = await fetchSkillFiles('acme-org/skills', 's');

    expect(files[0].content).toBe(original);
  });

  it('calls the GitHub API with the correct repo and path', async () => {
    const dirListing = [{ type: 'file', name: 'SKILL.md', path: 'skills/auth/SKILL.md' }];

    mockedExeca
      .mockResolvedValueOnce({ stdout: JSON.stringify(dirListing) } as any)
      .mockResolvedValueOnce(makeFileResponse('content') as any);

    await fetchSkillFiles('my-org/my-repo', 'auth');

    expect(mockedExeca).toHaveBeenNthCalledWith(1, 'gh', [
      'api',
      'repos/my-org/my-repo/contents/skills/auth',
    ]);
    expect(mockedExeca).toHaveBeenNthCalledWith(2, 'gh', [
      'api',
      'repos/my-org/my-repo/contents/skills/auth/SKILL.md',
    ]);
  });
});
