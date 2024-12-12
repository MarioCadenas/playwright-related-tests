# Playwright Related Tests

## Install

```bash
npm install playwright-related-tests
```

## How to use it

### Replace your test function

Simply use the `test` function from `playwright-related-tests`, as follows:

```ts
import { test, expect } from 'playwright-related-tests';

test.describe('Navigation to example', () => {
  test('should open the my view', async ({ page }) => {
    await expect(page.getByTestId('some-element-id')).toBeVisible();
  });
});
```

The expect function is also exported so you can use import it from the package as well.

### Making it work out of the box

In your global setup, modify the function to initialize the configuration and allow this package to prepare your config to run the tests it finds.

```ts
// global-setup.ts
import { FullConfig } from '@playwright/test';
import {
  RelatedTestsConfig,
  updateConfigWithImpactedTests,
} from 'playwright-related-tests';

export default async function globalSetup(config: FullConfig) {
  RelatedTestsConfig.init({
    url: 'http://localhost:5173',
    exitProcess: false,
  });

  await updateConfigWithImpactedTests(config);
}
```

### Customizing grep

```ts
// global-setup.ts
import { FullConfig } from '@playwright/test';
import {
  RelatedTestsConfig,
  getImpactedTestsRegex,
} from 'playwright-related-tests';

export default async function globalSetup(config: FullConfig) {
  RelatedTestsConfig.init({
    url: 'http://localhost:5173',
    affectedIgnorePatterns: ['some-js-file.js', 'some external'],
  });

  const testTitleRegex = await getImpactedTestsRegex();

  if (testTitleRegex) {
    // You can decide here which projects you want to use the regex for.
    config.grep = testTitleRegex;

    config.projects.forEach((project) => {
      project.grep = testTitleRegex;
    });
  }
}
```

## First run

Once you have this setup already done, all the tests need to run so the package can collect all the files that are related to each test. Once it finishes, you should see a new folder called `.affected-files` with a list of `.json` files. Each of these files contains an array of files that are related to each test. If you find expressions or files that are not part of your code, you can ignore them using the `affectedIgnorePatterns` in the config.

This folder is meant to be commited to your repository, so the package can calculate which tests should be run in your pull request step.

## How do the affected files get updated?

If there are new files or removed files, those will be updated on each run. It might happen that if you don't run the tests locally, some changes to these files will be done in the CI, and you most probably will want to update the files by running the tests locally or simply getting the changes from the CI and commiting them.

TODO

- [ ] Find out a way to allow users to filter files or expressions from their side (might need a js config file with a function).
- [ ] Find a way to make this work when the user also wants to run using coverage.
- [ ] Find a way to control how to update the affected files.
- [ ] Allow passing a flag to only run affected tests so it can be run on PR and then skip this on master
- [ ] Make a relation to files that are imported into the test file too
- [ ] Document usage properly
- [ ] Add S3/R2 connector logic
