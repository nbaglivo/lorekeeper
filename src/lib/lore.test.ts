import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchLoreConfig, parseGitHubSkillUrl } from './lore.js';

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
      skills: { 'my-skill': 'https://github.com/org/repo/tree/main/skills/my-skill' },
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

describe('parseGitHubSkillUrl', () => {
  it('parses a valid GitHub tree URL', () => {
    const result = parseGitHubSkillUrl(
      'https://github.com/other-org/their-repo/tree/main/skills/code-review'
    );
    expect(result).toEqual({ repo: 'other-org/their-repo', path: 'skills/code-review' });
  });

  it('handles nested paths', () => {
    const result = parseGitHubSkillUrl(
      'https://github.com/org/repo/tree/develop/folder/sub/skill'
    );
    expect(result).toEqual({ repo: 'org/repo', path: 'folder/sub/skill' });
  });

  it('handles non-main branch names', () => {
    const result = parseGitHubSkillUrl(
      'https://github.com/org/repo/tree/develop/skills/tool'
    );
    expect(result).toEqual({ repo: 'org/repo', path: 'skills/tool' });
  });

  it('throws on a non-GitHub URL', () => {
    expect(() => parseGitHubSkillUrl('https://gitlab.com/org/repo/skills/skill')).toThrow(
      'Invalid GitHub skill URL'
    );
  });

  it('throws on a GitHub URL without /tree/ segment', () => {
    expect(() => parseGitHubSkillUrl('https://github.com/org/repo')).toThrow(
      'Invalid GitHub skill URL'
    );
  });
});
