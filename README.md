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

TODO

- [ ] Find out a way to allow users to filter files or expressions from their side (might need a js config file with a function).
- [ ] Find a way to make this work when the user also wants to run using coverage.
- [ ] Find a way to control how to update the affected files.
- [ ] Allow passing a flag to only run affected tests so it can be run on PR and then skip this on master
- [ ] Make a relation to files that are imported into the test file too
- [ ] Document usage properly
