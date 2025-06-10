import * as path from 'node:path';
import type { EntryFile, CandidateFile } from './types';

export function filterEntryFiles(
  files: string[],
  entry: string,
  exclude: string[],
  _log: (...args: any[]) => void
): EntryFile[] {
  const result: EntryFile[] = [];
  const nameToFile = new Map<string, { file: string; priority: number }>();

  // 从entry模式中提取基础目录
  let basePattern = entry.replace(/\/\*.*$/, ''); // 去掉glob部分
  // 如果基础模式为空或不合理，使用默认处理
  if (!basePattern || basePattern === entry) {
    basePattern = path.dirname(entry.split('*')[0]);
  }
  const candidateFiles: CandidateFile[] = [];

  for (const file of files) {
    if (exclude.includes(file)) {
      continue;
    }

    // 统一使用正斜杠处理路径，确保Windows兼容性
    const normalizedFile = file.replace(/\\/g, '/');
    const normalizedBasePattern = basePattern.replace(/\\/g, '/');

    const relativePath = path.posix.relative(normalizedBasePattern, normalizedFile);
    const pathParts = relativePath.split('/'); // 使用正斜杠分割

    if (pathParts.length === 1) {
      // 第一级文件：src/pages/about.js -> /about.html
      const fileName = pathParts[0];
      const name = path.posix.basename(fileName, path.posix.extname(fileName));
      candidateFiles.push({ name, file, priority: 1 });
    } else if (pathParts.length >= 2) {
      // 目录下的文件
      const fileName = path.posix.basename(normalizedFile, path.posix.extname(normalizedFile));
      const dirName = pathParts[0];

      if (fileName === 'main') {
        // 目录下的main文件：src/pages/mobile/main.ts -> /mobile.html
        candidateFiles.push({ name: dirName, file, priority: 2 });
      }
    }
  }

  // 按照优先级处理冲突：目录优先覆盖文件（优先级2 > 优先级1）
  for (const candidate of candidateFiles) {
    const existing = nameToFile.get(candidate.name);

    if (!existing) {
      nameToFile.set(candidate.name, { file: candidate.file, priority: candidate.priority });
    } else {
      if (candidate.priority > existing.priority) {
        nameToFile.set(candidate.name, { file: candidate.file, priority: candidate.priority });
      }
    }
  }

  for (const [name, { file }] of nameToFile.entries()) {
    result.push({ name, file });
  }

  return result;
}
