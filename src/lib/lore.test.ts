import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchLoreConfig, parseGitHubRepoUrl } from './lore.js';

vi.mock('execa', () => ({
  execa: vi.fn(),
}));

import { execa } from 'execa';

const mockedExeca = vi.mocked(execa);

function makeLoreResponse(config: object) {
  const content = JSON.stringify(config);
  return {
    stdout: JSON.stringify({
      content: Buffer.from(content).toString('base64'),
      encoding: 'base64',
    }),
  };
}

describe('fetchLoreConfig', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when lore.json does not exist', async () => {
    mockedExeca.mockRejectedValueOnce(
      Object.assign(new Error('Not Found'), { stderr: 'Not Found (HTTP 404)' })
    );
    expect(await fetchLoreConfig('owner/repo')).toBeNull();
  });

  it('returns parsed config when lore.json exists', async () => {
    const loreConfig = {
      skills: { 'find-skills': 'https://github.com/vercel-labs/skills' },
    };
    mockedExeca.mockResolvedValueOnce(makeLoreResponse(loreConfig) as any);

    expect(await fetchLoreConfig('owner/repo')).toEqual(loreConfig);
  });

  it('returns null on any fetch error', async () => {
    mockedExeca.mockRejectedValueOnce(new Error('Network error'));
    expect(await fetchLoreConfig('owner/repo')).toBeNull();
  });

  it('calls the API with the correct path', async () => {
    mockedExeca.mockRejectedValueOnce(new Error('Not Found'));
    await fetchLoreConfig('my-org/skills');
    expect(mockedExeca).toHaveBeenCalledWith('gh', [
      'api',
      'repos/my-org/skills/contents/skills/lore.json',
    ]);
  });
});

describe('parseGitHubRepoUrl', () => {
  it('parses a GitHub repo URL', () => {
    expect(parseGitHubRepoUrl('https://github.com/vercel-labs/skills')).toBe('vercel-labs/skills');
  });

  it('handles a trailing slash', () => {
    expect(parseGitHubRepoUrl('https://github.com/vercel-labs/skills/')).toBe('vercel-labs/skills');
  });

  it('throws on a non-GitHub URL', () => {
    expect(() => parseGitHubRepoUrl('https://gitlab.com/org/repo')).toThrow(
      'Invalid GitHub repo URL'
    );
  });

  it('throws on a GitHub URL with no repo path', () => {
    expect(() => parseGitHubRepoUrl('https://github.com/org')).toThrow(
      'Invalid GitHub repo URL'
    );
  });

  it('throws when extra path segments are present', () => {
    expect(() =>
      parseGitHubRepoUrl('https://github.com/vercel-labs/skills/find-skills')
    ).toThrow('Invalid GitHub repo URL');
  });
});
