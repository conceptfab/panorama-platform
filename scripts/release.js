#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

function exec(command, silent = false) {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit',
    });
    return result;
  } catch (error) {
    console.error(`Error executing: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

async function main() {
  const packagePath = path.join(__dirname, '..', 'package.json');

  // Read current package.json
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const currentVersion = packageJson.version;

  console.log('\n========================================');
  console.log('         RELEASE SCRIPT');
  console.log('========================================\n');
  console.log(`Current version: \x1b[36m${currentVersion}\x1b[0m\n`);

  // Ask for new version
  const newVersion = await ask(
    `Enter new version (or press Enter to keep ${currentVersion}): `
  );

  if (newVersion && newVersion !== currentVersion) {
    // Validate version format (basic semver check)
    if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(newVersion)) {
      console.error(
        '\x1b[31mError: Invalid version format. Use semver format (e.g., 1.0.0 or 1.0.0-beta.1)\x1b[0m'
      );
      rl.close();
      process.exit(1);
    }

    // Update package.json
    packageJson.version = newVersion;
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(
      `\n\x1b[32mVersion updated: ${currentVersion} -> ${newVersion}\x1b[0m\n`
    );
  } else {
    console.log('\n\x1b[33mVersion unchanged.\x1b[0m\n');
  }

  // Show git status
  console.log('Current git status:');
  console.log('----------------------------------------');
  exec('git status --short');
  console.log('----------------------------------------\n');

  // Ask for confirmation to stage files
  const stageConfirm = await ask('Stage all changes for commit? (y/n): ');

  if (stageConfirm.toLowerCase() !== 'y') {
    console.log('\x1b[33mAborted.\x1b[0m');
    rl.close();
    process.exit(0);
  }

  // Stage all files
  exec('git add -A');
  console.log('\x1b[32mFiles staged.\x1b[0m\n');

  // Show what will be committed
  console.log('Files to be committed:');
  console.log('----------------------------------------');
  exec('git status --short');
  console.log('----------------------------------------\n');

  // Ask for commit message (version will be prepended)
  const finalVersion = newVersion || currentVersion;
  const versionPrefix = `v${finalVersion}`;
  const commitMessage = await ask(
    `Enter commit message (optional, version "${versionPrefix}" will be at the start): `
  );

  const custom = commitMessage.trim();
  const finalMessage = custom ? `${versionPrefix} ${custom}` : versionPrefix;

  // Commit
  console.log('\nCommitting...');
  exec(`git commit -m "${finalMessage}"`);
  console.log('\x1b[32mCommit created.\x1b[0m\n');

  // Ask for push confirmation
  const pushConfirm = await ask('Push to remote? (y/n): ');

  if (pushConfirm.toLowerCase() === 'y') {
    console.log('\nPushing to remote...');
    exec('git push');
    console.log('\x1b[32mPushed successfully!\x1b[0m\n');
  } else {
    console.log(
      '\x1b[33mPush skipped. Run "git push" manually when ready.\x1b[0m\n'
    );
  }

  console.log('========================================');
  console.log('         RELEASE COMPLETE');
  console.log('========================================\n');

  rl.close();
}

main().catch((error) => {
  console.error(error);
  rl.close();
  process.exit(1);
});
