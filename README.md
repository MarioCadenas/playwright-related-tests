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

In your global setup, modify the function to initialize the configuration and allow this package to prepare your config
to run the tests it finds.

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

  await updateConfigWithImpactedTests(config, 'your-path-to-remote');
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

```ts
// global-teardown.ts
import { upSyncToRemote } from 'playwright-related-tests';

export default async function globalTeardown() {
  // if using s3, `your-path-to-remote` will be the folder in the bucket.
  await upSyncToRemote('main', 'your-path-to-remote');
}
```

## Functions and classes

### updateConfigWithImpactedTests

This function allows you to synchronize the files from the remote of your choice. By default it uses the S3 connector,
but you can provide the connector of your choice. The library provides 2 predefined connectors `S3Connector` and `EndpointConnector` which you can import directly from `playwright-related-tests`, or you can create your own connector by extending the `RemoteConnector` class.

Example
```ts
// global-setup.ts
import { updateConfigWithImpactedTests, EndpointConnector} from 'playwright-related-tests';

await updateConfigWithImpactedTests(
  config,
  'main',
  {
    url: 'http://127.0.0.1:8080',
    method: 'GET',
    headers: {
      "Content-Type": "application/gzip",
    },
  },
  EndpointConnector,
);
```

The first argument is the Playwright config.

The second argument is the type of relationship, by default is main, but commits will be supported in the future. 

The third argument is the connector's `options` which will vary depending on the connector provided in the 4th argument. 

- For `S3Connector`: path where the file will be found. In s3 for example, it will be the folder in the bucket.

- For `EndpointConnector`: An object with required `url`, `headers`, `method` properties and optional `body` that will be used to fetch the file.

The last argument is the connector, which defaults to `S3Connector`.

### upSyncToRemote

This function allows you to synchronize the files to the remote of your choice. By default it uses the S3 connector, but
you can provide the connector of your choice.
The first argument is the type of relationship, by default is main, but commits will be supported in the future.

The second argument is the path were the file will be uploaded. In s3 for example, it will be the folder in the bucket.

The last argument is the connector, by default is the S3 connector.

## Connectors

### S3

This connector allows you to synchronize your files into an s3 bucket.

It allows downloading and uploading, but for this, it will need a few env vars in order to work.

- AWS_REGION - The region of your bucket
- AWS_ACCESS_KEY_ID - The access key id
- AWS_ACCESS_KEY_SECRET - The secret key to access the bucket
- AWS_BUCKET_NAME - The name of the bucket

If all of this is set, you can use the `upSyncToRemote` in your global-teardown to upload the files to the bucket.

```ts

## First run

Once the setup is done, this will need a first run against the main/master branch so it can get the relationships between the tests and the files.
From that point, new PRs or the local environment will pick up the changes that are in a remote (like S3), and use those files to compare the changes.

Ideally, the `.affected-files` shouldn't be commited to the repository, but it could also be done if instead of using S3 or any other remote service,
you wanted to keep the files in the repo. This has the tradeoff of needing to always be in sync with the master/main branch.

## How do the affected files get updated?

Ideally, these files will only get updated when running the full suite against master. When running on PRs they shouldn't change the main state of the files.

TODO

- [ ] Find a way to make this work when the user also wants to run using coverage.
```
