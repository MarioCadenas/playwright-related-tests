# Playwright Related Tests

## How to use it

```ts
// global-setup.ts
import { FullConfig } from '@playwright/test';
import {
  RelatedTestsConfig,
  getImpactedTestsRegex,
} from 'playwright-related-tests';

export default async function globalSetup(config: FullConfig) {
  RTC.RelatedTestsConfig.init({
    url: 'http://localhost:5173',
    affectedIgnorePatterns: ['some-js-file.js', 'some external'],
  });

  const testTitleRegex = await RTC.getImpactedTestsRegex();

  if (testTitleRegex) {
    config.grep = testTitleRegex;

    config.projects.forEach((project) => {
      project.grep = testTitleRegex;
    });
  }
}
```

or

```ts
// global-setup.ts
import { FullConfig } from '@playwright/test';
import {
  RelatedTestsConfig,
  updateConfigWithImpactedTests,
} from 'playwright-related-tests';

export default async function globalSetup(config: FullConfig) {
  RTC.RelatedTestsConfig.init({
    url: 'http://localhost:5173',
    exitProcess: false,
  });

  await updateConfigWithImpactedTests();
}
```

TODO

- [ ] Find out a way to allow users to filter files or expressions from their side (might need a js config file with a function).
- [ ] Find a way to make this work when the user also wants to run using coverage.
- [ ] Find a way to control how to update the affected files.
- [ ] Allow passing a flag to only run affected tests so it can be run on PR and then skip this on master
- [ ] Make a relation to files that are imported into the test file too
- [ ] Document usage properly
