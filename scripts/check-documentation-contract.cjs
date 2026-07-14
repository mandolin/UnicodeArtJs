#!/usr/bin/env node

/**
 * 检查已冻结的注释与 API 文档基础契约。
 *
 * @lang zh-CN 该脚本只检查术语表、CLI 受控试点和常见 JSDoc 类型错误；不以注释数量代替对公开行为的人工复核。
 * @lang en This script checks the glossary, the controlled CLI pilot, and common JSDoc type mistakes; it does not replace human review of public behavior with comment counts.
 */

const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const guidePath = path.join(repositoryRoot, 'docs', 'code-documentation.md');
const cliSourcePath = path.join(repositoryRoot, 'packages', 'cli', 'src', 'console.js');
const coreSourceRoot = path.join(repositoryRoot, 'packages', 'core', 'src');

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function requireText(content, expected, label) {
  if (!content.includes(expected)) {
    throw new Error(`Documentation contract is missing ${label}: ${expected}`);
  }
}

function findFunctionComment(source, functionName) {
  const expression = new RegExp(
    String.raw`/\*\*([\s\S]*?)\*/\s*function\s+${functionName}\s*\(`
  );
  const match = source.match(expression);

  if (!match) {
    throw new Error(`Unable to locate the JSDoc block for ${functionName}.`);
  }

  return match[1];
}

function listSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(fullPath);
    }

    return entry.isFile() && /\.(?:ts|js)$/.test(entry.name) ? [fullPath] : [];
  });
}

const guide = readUtf8(guidePath);
for (const term of ['字素', '视觉字体', '字素字体', '宽字素', '裱框', '语义文档', 'Unicode Art Font (UAF)']) {
  requireText(guide, term, `glossary term ${term}`);
}

for (const requirement of ['@lang zh-CN', '@lang en', '@deprecated', 'getCoreCapabilities()', '发布 tag 或确定 commit']) {
  requireText(guide, requirement, `documentation rule ${requirement}`);
}

const cliSource = readUtf8(cliSourcePath);
for (const functionName of ['loadLanguage', 't', 'getCommandOptions', 'normalizeConfig', 'parseBoxOption']) {
  const comment = findFunctionComment(cliSource, functionName);
  requireText(comment, '@lang zh-CN', `${functionName} Chinese description`);
  requireText(comment, '@lang en', `${functionName} English description`);
  requireText(comment, '@param', `${functionName} parameter contract`);
  requireText(comment, '@returns', `${functionName} return contract`);
}

const invalidObjectReturn = /@returns\s+\{\s+[A-Za-z_$][\w$]*\s*:/;
const invalidFiles = listSourceFiles(coreSourceRoot).filter((filePath) => invalidObjectReturn.test(readUtf8(filePath)));
if (invalidFiles.length > 0) {
  const relativeFiles = invalidFiles.map((filePath) => path.relative(repositoryRoot, filePath));
  throw new Error(`JSDoc object return type needs double braces in: ${relativeFiles.join(', ')}`);
}

process.stdout.write('Documentation contract checks passed.\n');
