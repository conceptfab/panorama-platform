#!/usr/bin/env node

/**
 * Pre-deployment check script for Railway
 * Run: node scripts/check-deploy.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) =>
    console.log(
      `\n${colors.bold}${colors.cyan}═══ ${msg} ═══${colors.reset}\n`
    ),
};

let errors = 0;
let warnings = 0;

function check(name, fn) {
  try {
    const result = fn();
    if (result === true) {
      log.success(name);
    } else if (result === 'warn') {
      log.warn(name);
      warnings++;
    } else {
      log.error(name);
      errors++;
    }
  } catch (e) {
    log.error(`${name}: ${e.message}`);
    errors++;
  }
}

function exec(cmd, options = {}) {
  return execSync(cmd, {
    cwd: ROOT,
    encoding: 'utf-8',
    stdio: 'pipe',
    ...options,
  });
}

function fileExists(filePath) {
  return fs.existsSync(path.join(ROOT, filePath));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, filePath), 'utf-8'));
}

// ═══════════════════════════════════════════════════════════════════
// CHECKS
// ═══════════════════════════════════════════════════════════════════

log.header('1. Project Structure');

check('package.json exists', () => fileExists('package.json'));
check('next.config.ts exists', () => fileExists('next.config.ts'));
check('tsconfig.json exists', () => fileExists('tsconfig.json'));
check('.env.example exists', () => fileExists('.env.example'));

log.header('2. Dependencies');

check('node_modules exists', () => {
  if (!fileExists('node_modules')) {
    throw new Error('Run: npm install');
  }
  return true;
});

check('package-lock.json exists', () => {
  if (!fileExists('package-lock.json')) {
    log.warn('  └─ Recommended for consistent builds');
    return 'warn';
  }
  return true;
});

log.header('3. TypeScript Check');

check('TypeScript compilation', () => {
  try {
    exec('npx tsc --noEmit', { timeout: 60000 });
    return true;
  } catch (e) {
    console.log(`\n${colors.red}${e.stdout || e.message}${colors.reset}`);
    return false;
  }
});

log.header('4. ESLint Check');

check('ESLint validation', () => {
  try {
    exec('npm run lint -- --max-warnings=0', { timeout: 60000 });
    return true;
  } catch (e) {
    const output = e.stdout || e.stderr || e.message;
    if (output.includes('warning')) {
      console.log(`\n${colors.yellow}${output}${colors.reset}`);
      return 'warn';
    }
    console.log(`\n${colors.red}${output}${colors.reset}`);
    return false;
  }
});

log.header('5. Build Test');

check('Next.js production build', () => {
  try {
    log.info('Building... (this may take a moment)');
    exec('npm run build', { timeout: 180000 });
    return true;
  } catch (e) {
    console.log(
      `\n${colors.red}${e.stdout || e.stderr || e.message}${colors.reset}`
    );
    return false;
  }
});

check('.next directory created', () => fileExists('.next'));

log.header('6. Environment Variables');

const requiredEnvVars = [
  {
    name: 'NEXT_PUBLIC_APP_URL',
    desc: 'Application URL (e.g., https://your-app.railway.app)',
  },
  {
    name: 'JWT_SECRET',
    desc: 'JWT signing secret (min 32 chars)',
    secret: true,
  },
  {
    name: 'RESEND_API_KEY',
    desc: 'Resend.com API key for emails',
    secret: true,
  },
];

const optionalEnvVars = [
  {
    name: 'NODE_ENV',
    desc: 'Should be "production" on Railway',
    default: 'production',
  },
  { name: 'JWT_EXPIRATION', desc: 'Session duration', default: '7d' },
  { name: 'EMAIL_FROM', desc: 'Sender email address' },
  {
    name: 'PANO_DATA_DIR',
    desc: 'Data root (data + uploads). Railway: /pano-data',
    default: 'process.cwd()',
  },
  { name: 'UPLOAD_DIR', desc: 'File upload directory', default: './uploads' },
];

console.log(`${colors.bold}Required variables for Railway:${colors.reset}\n`);
requiredEnvVars.forEach((v) => {
  const status = v.secret ? '(secret)' : '';
  console.log(`  ${colors.cyan}${v.name}${colors.reset} ${status}`);
  console.log(`    └─ ${v.desc}\n`);
});

console.log(`${colors.bold}Optional variables:${colors.reset}\n`);
optionalEnvVars.forEach((v) => {
  const def = v.default ? ` (default: ${v.default})` : '';
  console.log(`  ${colors.cyan}${v.name}${colors.reset}${def}`);
  console.log(`    └─ ${v.desc}\n`);
});

log.header('7. Railway-Specific Checks');

check('Start script exists', () => {
  const pkg = readJson('package.json');
  return !!pkg.scripts?.start;
});

check('Build script exists', () => {
  const pkg = readJson('package.json');
  return !!pkg.scripts?.build;
});

// Check for common Railway issues
check('No hardcoded localhost URLs in code', () => {
  try {
    const result = exec(
      'grep -r "localhost:3000" src/ --include="*.ts" --include="*.tsx" || true'
    );
    if (result.trim() && !result.includes('NEXT_PUBLIC_APP_URL')) {
      console.log(
        `\n${colors.yellow}Found localhost references:${colors.reset}`
      );
      console.log(result);
      return 'warn';
    }
    return true;
  } catch {
    return true;
  }
});

check('sharp package for image optimization', () => {
  const pkg = readJson('package.json');
  return !!pkg.dependencies?.sharp;
});

log.header('8. Storage Check');

check('Upload directory configuration', () => {
  log.info('Note: Railway has ephemeral storage.');
  log.info(
    'For persistent files, use external storage (S3, Cloudflare R2, etc.)'
  );
  return 'warn';
});

// ═══════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════

log.header('Summary');

if (errors === 0 && warnings === 0) {
  console.log(
    `${colors.green}${colors.bold}All checks passed! Ready for deployment.${colors.reset}\n`
  );
} else if (errors === 0) {
  console.log(
    `${colors.yellow}${colors.bold}Passed with ${warnings} warning(s).${colors.reset}`
  );
  console.log('Review warnings before deploying.\n');
} else {
  console.log(
    `${colors.red}${colors.bold}Failed with ${errors} error(s) and ${warnings} warning(s).${colors.reset}`
  );
  console.log('Fix errors before deploying.\n');
}

console.log(`${colors.bold}Railway Deployment Steps:${colors.reset}`);
console.log('1. Push code to GitHub');
console.log('2. Connect repo to Railway (railway.app)');
console.log('3. Add environment variables in Railway dashboard');
console.log('4. Deploy!\n');

console.log(
  `${colors.bold}Required Railway Environment Variables:${colors.reset}`
);
requiredEnvVars.forEach((v) => {
  console.log(`  - ${v.name}`);
});
console.log('');

process.exit(errors > 0 ? 1 : 0);
