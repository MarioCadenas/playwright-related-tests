import { exec as syncExec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
// This is a simple script that will run the E2E tests in a playground
// and help you test new changes made to the library.

const exec = promisify(syncExec);

// Make changes to a component that is used in the E2E tests
const filePath = 'test/playground/src/components/Home/Home.tsx';
const file = fs.readFileSync(filePath, 'utf8').toString();
const changedFile = file.replace('Home Page', 'Welcome to the Home Page');
fs.writeFileSync(filePath, changedFile, 'utf8');

// Run the E2E test and check how only the home.spec.js is executed
const { stdout: e2eResult } = await exec('cd test/playground && npm run e2e');
console.log(e2eResult);

// Restore the modified .affected-files and the component that was modified
const affectedFilesDir = 'test/playground/.affected-files';
const paths = [
  path.join(
    affectedFilesDir,
    'about.spec.js - Navigation to About page - should display the page title.json',
  ),
  path.join(
    affectedFilesDir,
    'home.spec.js - Navigation to Home page - should display the page title.json',
  ),
  path.join(
    affectedFilesDir,
    'profile.spec.js - Navigation to Profile page - should display the page title.json',
  ),
  filePath,
];
await exec(`git restore ${paths.map((path) => `"${path}"`).join(' ')}`);
