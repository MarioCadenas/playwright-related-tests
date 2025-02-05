import { exec as syncExec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const PLAYGROUND_DIR = 'test/playground';

const exec = promisify(syncExec);
async function executeCommandWithLogs(command: string) {
  const { stdout, stderr } = await exec(command);
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
  console.log(`stdout: ${stdout}`);
}

// Modify a component that is used in the E2E tests
const filePath = path.join(PLAYGROUND_DIR, 'src/components/Home/Home.tsx');
const file = fs.readFileSync(filePath, 'utf8').toString();
const changedFile = file.replace('Home Page', 'Welcome to the Home Page');
fs.writeFileSync(filePath, changedFile, 'utf8');

// Copy test/playground/fixtures to test/playground/node_modules/.playwright-related-tests
const affectedFilesFixture = path.join(PLAYGROUND_DIR, 'fixtures');
const prtConfigFoler = path.join(
  PLAYGROUND_DIR,
  'node_modules/.playwright-related-tests',
);
await fs.promises.cp(affectedFilesFixture, prtConfigFoler, { recursive: true });

// Run the E2E test and check how only the home.spec.js is executed
await executeCommandWithLogs('cd test/playground && npm run e2e');

// Restore the modified component
const paths = [filePath];
await exec(`git restore ${paths.map((path) => `"${path}"`).join(' ')}`);
