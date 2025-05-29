import * as path from "node:path";
import type { EntryFile, CandidateFile } from "./types";

export function filterEntryFiles(
  files: string[],
  entry: string,
  exclude: string[],
  log: (...args: any[]) => void
): EntryFile[] {
  const result: EntryFile[] = [];
  const nameToFile = new Map<string, string>();

  const basePattern = entry.replace(/\/\*\*.*$/, "");
  log("基础目录模式:", basePattern);

  const candidateFiles: CandidateFile[] = [];

  for (const file of files) {
    if (exclude.includes(file)) {
      log(`跳过排除文件: ${file}`);
      continue;
    }

    const relativePath = path.relative(basePattern, file);
    const pathParts = relativePath.split(path.sep);

    log(`处理文件: ${file}`);
    log(`相对路径: ${relativePath}`);
    log(`路径部分: ${pathParts}`);

    if (pathParts.length === 1) {
      const fileName = pathParts[0];
      const name = path.basename(fileName, path.extname(fileName));
      candidateFiles.push({ name, file, priority: 1 });
      log(`📄 第一级文件: ${file} -> ${name}.html (优先级: 1)`);
    } else if (pathParts.length >= 2) {
      const fileName = path.basename(file, path.extname(file));
      const dirName = pathParts[0];

      if (fileName === "main") {
        candidateFiles.push({ name: dirName, file, priority: 2 });
        log(`📁 目录main文件: ${file} -> ${dirName}.html (优先级: 2)`);
      } else {
        log(`❌ 跳过文件: ${file} (不是main文件)`);
      }
    } else {
      log(`❌ 跳过文件: ${file} (路径层级不符合)`);
    }
  }

  for (const candidate of candidateFiles) {
    const existing = nameToFile.get(candidate.name);

    if (!existing) {
      nameToFile.set(candidate.name, candidate.file);
      log(`✅ 添加页面: ${candidate.name} -> ${candidate.file}`);
    } else {
      const existingCandidate = candidateFiles.find((c) => c.file === existing);
      if (
        existingCandidate &&
        candidate.priority > existingCandidate.priority
      ) {
        nameToFile.set(candidate.name, candidate.file);
        log(
          `🔄 替换页面: ${candidate.name} -> ${candidate.file} (替换 ${existing})`
        );
      } else {
        log(
          `⚠️ 冲突跳过: ${candidate.name} -> ${candidate.file} (保留 ${existing})`
        );
      }
    }
  }

  for (const [name, file] of nameToFile.entries()) {
    result.push({ name, file });
  }

  return result;
}
