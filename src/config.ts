import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_MODEL } from './analyze.js';

export interface RepoArchitectConfig {
  outputDir: string;
  ignore: string[];
  include: string[];
  model: string;
}

export const DEFAULT_CONFIG: RepoArchitectConfig = {
  outputDir: 'docs/architecture',
  ignore: [],
  include: [],
  model: DEFAULT_MODEL,
};

const CONFIG_FILENAME = '.repo-architect.json';

export async function loadConfig(dir: string): Promise<RepoArchitectConfig> {
  const configPath = path.join(dir, CONFIG_FILENAME);

  let raw: string;
  try {
    raw = await readFile(configPath, 'utf-8');
  } catch {
    return { ...DEFAULT_CONFIG };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in ${CONFIG_FILENAME}`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${CONFIG_FILENAME} must be a JSON object`);
  }

  const obj = parsed as Record<string, unknown>;
  const config = { ...DEFAULT_CONFIG };

  if ('outputDir' in obj) {
    if (typeof obj.outputDir !== 'string') throw new Error(`${CONFIG_FILENAME}: outputDir must be a string`);
    if (path.isAbsolute(obj.outputDir)) throw new Error(`${CONFIG_FILENAME}: outputDir must be a relative path`);
    config.outputDir = obj.outputDir;
  }

  if ('ignore' in obj) {
    if (!Array.isArray(obj.ignore) || !obj.ignore.every(v => typeof v === 'string')) {
      throw new Error(`${CONFIG_FILENAME}: ignore must be an array of strings`);
    }
    config.ignore = obj.ignore;
  }

  if ('include' in obj) {
    if (!Array.isArray(obj.include) || !obj.include.every(v => typeof v === 'string')) {
      throw new Error(`${CONFIG_FILENAME}: include must be an array of strings`);
    }
    config.include = obj.include;
  }

  if ('model' in obj) {
    if (typeof obj.model !== 'string') throw new Error(`${CONFIG_FILENAME}: model must be a string`);
    config.model = obj.model;
  }

  return config;
}

export async function createDefaultConfig(dir: string): Promise<string> {
  const configPath = path.join(dir, CONFIG_FILENAME);
  const content = JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n';
  await writeFile(configPath, content);
  return configPath;
}
