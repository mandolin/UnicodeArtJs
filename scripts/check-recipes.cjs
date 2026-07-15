#!/usr/bin/env node

/**
 * 校验公开 recipes 与 examples 的可运行性。
 *
 * 该脚本不追求字符画像素级快照，而是保证示例入口能在干净仓库依赖下执行，
 * 并且公开 recipe 文档不泄漏内部目录或一次性调试资产。
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const nodeBin = process.execPath;
const recipeDocPath = path.join(repoRoot, 'docs', 'recipes.md');
const cliEntryPath = path.join(repoRoot, 'packages', 'cli', 'src', 'console.js');

const nodeExamples = [
  'examples/node/text-banner.mjs',
  'examples/node/image-file.mjs',
  'examples/node/semantic-document.mjs',
  'examples/node/uaf-font.mjs',
];

function fail(message) {
  throw new Error(message);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false,
    ...options,
  });

  if (result.status !== 0) {
    fail([
      `Command failed: ${command} ${args.join(' ')}`,
      result.stderr,
      result.stdout,
    ].filter(Boolean).join('\n'));
  }

  return result;
}

function checkRecipeDoc() {
  if (!fs.existsSync(recipeDocPath)) {
    fail('Missing docs/recipes.md.');
  }

  const text = fs.readFileSync(recipeDocPath, 'utf8');
  for (const fragment of ['work-zone', 'ai/codex', '.generated-docs', 'K:\\', 'C:\\']) {
    if (text.includes(fragment)) {
      fail(`docs/recipes.md leaks internal fragment: ${fragment}`);
    }
  }

  for (const expected of [
    'examples/node/text-banner.mjs',
    'examples/node/image-file.mjs',
    'examples/node/semantic-document.mjs',
    'examples/node/uaf-font.mjs',
    'UnicodeArtJs: Open Converter',
  ]) {
    if (!text.includes(expected)) {
      fail(`docs/recipes.md is missing recipe reference: ${expected}`);
    }
  }
}

function checkNodeExamples() {
  for (const example of nodeExamples) {
    const result = run(nodeBin, [example]);
    const marker = `[recipe:${path.basename(example, '.mjs').split('-')[0]}`;
    if (!result.stdout.includes('[recipe:')) {
      fail(`${example} did not print a recipe marker.`);
    }
    if (result.stdout.trim().length < marker.length + 20) {
      fail(`${example} output is unexpectedly short.`);
    }
  }
}

function checkCliRecipes() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unicode-art-recipes-'));
  try {
    const textOutput = path.join(tempDir, 'text.txt');
    run(nodeBin, [
      cliEntryPath,
      'text',
      'Recipe',
      '--no-config',
      '--height',
      '8',
      '--chars',
      ' .:-=+*#%@',
      '--box',
      '{"style":"ascii","padding":1,"title":"CLI"}',
      '--output',
      textOutput,
    ]);
    const textArt = fs.readFileSync(textOutput, 'utf8');
    if (!textArt.includes('CLI') || textArt.trim().split(/\r?\n/).length < 4) {
      fail('CLI text recipe output did not look like boxed art.');
    }

    const imageOutput = path.join(tempDir, 'image.txt');
    run(nodeBin, [
      cliEntryPath,
      'image',
      path.join(repoRoot, 'packages', 'core', 'tests', 'test-image-zhong.png'),
      '--no-config',
      '--height',
      '12',
      '--charset',
      'ASCII',
      '--image-backend',
      'napi-rs',
      '--trim-trailing-spaces',
      '--output',
      imageOutput,
    ]);
    const imageArt = fs.readFileSync(imageOutput, 'utf8');
    if (imageArt.trim().split(/\r?\n/).length < 8) {
      fail('CLI image recipe output is unexpectedly short.');
    }

    const extensionResult = run(nodeBin, [
      cliEntryPath,
      'extension',
      'inspect',
      path.join(repoRoot, 'packages', 'extension-line-banner', 'unicode-art-extension.json'),
      '--json',
    ]);
    const extensionSummary = JSON.parse(extensionResult.stdout);
    if (!extensionSummary.compatibility?.compatible || extensionSummary.resources.length === 0) {
      fail('CLI extension recipe did not inspect the official example package.');
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

checkRecipeDoc();
checkNodeExamples();
checkCliRecipes();

process.stdout.write('Recipes and executable examples passed smoke checks.\n');
