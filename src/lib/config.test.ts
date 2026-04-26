import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readConfig, writeConfig, CONFIG_PATH } from './config.js';

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

import { readFile, writeFile, mkdir } from 'fs/promises';

const mockedReadFile = vi.mocked(readFile);
const mockedWriteFile = vi.mocked(writeFile);
const mockedMkdir = vi.mocked(mkdir);

describe('readConfig', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when the config file does not exist', async () => {
    mockedReadFile.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    expect(await readConfig()).toBeNull();
  });

  it('returns the parsed config when the file exists', async () => {
    mockedReadFile.mockResolvedValueOnce(JSON.stringify({ repo: 'acme-org/skills' }) as any);

    expect(await readConfig()).toEqual({ repo: 'acme-org/skills' });
  });
});

describe('writeConfig', () => {
  beforeEach(() => {
    mockedMkdir.mockResolvedValue(undefined as any);
    mockedWriteFile.mockResolvedValue(undefined as any);
  });

  it('creates the .lorekeeper directory', async () => {
    await writeConfig({ repo: 'acme-org/skills' });

    expect(mockedMkdir).toHaveBeenCalledWith(
      expect.stringContaining('.lorekeeper'),
      { recursive: true }
    );
  });

  it('writes formatted JSON to the config path', async () => {
    await writeConfig({ repo: 'acme-org/skills' });

    expect(mockedWriteFile).toHaveBeenCalledWith(
      CONFIG_PATH,
      JSON.stringify({ repo: 'acme-org/skills' }, null, 2),
      'utf-8'
    );
  });
});
