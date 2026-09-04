#!/usr/bin/env node
// Rebuilds the "bundle" branch: assembles the Bun backend + built Angular UI +
// CLI into one deployable release, then bumps the submodule pointers on main.
// Zero npm dependencies — only Node's built-in modules.
//
// Usage:
//   node scripts/build-bundle.mjs          # assemble locally, commit, don't push
//   node scripts/build-bundle.mjs --push   # also push bundle + main
//
// Safe to run repeatedly: if nothing changed since the last run, both the
// bundle-branch commit and the superproject pointer-bump commit are skipped.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUSH = process.argv.includes('--push');

function run(cmd, args, options = {}) {
  const { shell, ...rest } = options;
  const spawnOptions = { cwd: ROOT, stdio: 'inherit', ...rest };
  // When shell is needed (e.g. to invoke npm.cmd/npx.cmd on Windows), pass the
  // whole command as one string rather than a separate args array — Node
  // otherwise warns that shell + args-array invocations aren't safely escaped.
  const result = shell
    ? spawnSync(`${cmd} ${args.join(' ')}`, { ...spawnOptions, shell: true })
    : spawnSync(cmd, args, spawnOptions);
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} exited with code ${result.status}`);
  }
}

function runIn(cwd, cmd, args, extraOptions = {}) {
  run(cmd, args, { cwd, ...extraOptions });
}

function hasStagedChanges(cwd) {
  const result = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd, stdio: 'ignore' });
  // exit 0 = no diff, 1 = diff present, anything else = git error.
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`git diff --cached --quiet failed in ${cwd} (exit ${result.status})`);
  }
  return result.status === 1;
}

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function replaceDir(from, to) {
  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(to, { recursive: true });
  fs.cpSync(from, to, { recursive: true });
}

function writeFile(to, contents) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, contents);
}

function step(title) {
  console.log(`\n=== ${title} ===`);
}

function main() {
  const backendDir = path.join(ROOT, 'backend');
  const frontendDir = path.join(ROOT, 'frontend');
  const cliDir = path.join(ROOT, 'cli');
  const bundleDir = path.join(ROOT, 'bundle');

  step('Updating backend/frontend/cli submodules to their branch tips');
  run('git', ['submodule', 'update', '--init', '--remote', 'backend', 'frontend', 'cli']);

  step('Building the frontend (npm install + ng build)');
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  runIn(frontendDir, npmCmd, ['install'], { shell: true });
  runIn(frontendDir, npxCmd, ['ng', 'build'], { shell: true });

  const frontendIndexHtml = path.join(frontendDir, 'dist', 'snip-frontend', 'browser', 'index.html');
  if (!fs.existsSync(frontendIndexHtml)) {
    throw new Error(
      `Frontend build did not produce ${path.relative(ROOT, frontendIndexHtml)} — aborting.`
    );
  }

  step('Assembling bundle/');
  copyFile(path.join(backendDir, 'server.js'), path.join(bundleDir, 'server.js'));
  copyFile(path.join(cliDir, 'cli.js'), path.join(bundleDir, 'cli.js'));
  replaceDir(path.join(frontendDir, 'dist', 'snip-frontend', 'browser'), path.join(bundleDir, 'public'));

  writeFile(path.join(bundleDir, '.env'), 'PUBLIC_DIR=./public\n');

  writeFile(
    path.join(bundleDir, 'package.json'),
    JSON.stringify(
      {
        name: 'snip-bundle',
        version: '1.0.0',
        private: true,
        description: 'Generated Snip release: backend + built UI + CLI. Do not hand-edit.',
        scripts: {
          start: 'bun server.js',
        },
      },
      null,
      2
    ) + '\n'
  );

  writeFile(
    path.join(bundleDir, 'Dockerfile'),
    [
      'FROM oven/bun:1-alpine',
      'WORKDIR /app',
      'COPY . .',
      'ENV PORT=3000',
      'EXPOSE 3000',
      'CMD ["bun", "server.js"]',
      '',
    ].join('\n')
  );

  writeFile(
    path.join(bundleDir, '.dockerignore'),
    ['node_modules', '.git', '.env.local', 'npm-debug.log', ''].join('\n')
  );

  writeFile(
    path.join(bundleDir, 'railway.json'),
    JSON.stringify(
      {
        $schema: 'https://railway.app/railway.schema.json',
        build: {
          builder: 'DOCKERFILE',
          dockerfilePath: 'Dockerfile',
        },
        deploy: {
          restartPolicyType: 'ON_FAILURE',
        },
      },
      null,
      2
    ) + '\n'
  );

  step('Committing inside bundle/ (safe no-op if nothing changed)');
  runIn(bundleDir, 'git', ['add', '-A']);
  if (hasStagedChanges(bundleDir)) {
    runIn(bundleDir, 'git', ['commit', '-m', 'Rebuild bundle from backend/frontend/cli']);
    console.log('bundle/: committed changes.');
  } else {
    console.log('bundle/: nothing to commit (unchanged).');
  }

  step('Bumping submodule pointers on main (safe no-op if nothing changed)');
  run('git', ['add', 'backend', 'frontend', 'cli', 'bundle']);
  if (hasStagedChanges(ROOT)) {
    run('git', ['commit', '-m', 'Bump submodule pointers']);
    console.log('main: committed pointer bump.');
  } else {
    console.log('main: nothing to commit (unchanged).');
  }

  if (PUSH) {
    step('Pushing bundle and main');
    // Submodule checkouts are frequently in a detached HEAD state, so push the
    // current commit explicitly to the bundle branch rather than "git push".
    runIn(bundleDir, 'git', ['push', 'origin', 'HEAD:bundle']);
    run('git', ['push', 'origin', 'main']);
  } else {
    console.log('\n(Run again with --push to push bundle and main.)');
  }

  console.log('\nDone.');
}

main();
