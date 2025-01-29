# Playwright related tests playground

This playground will allow you to test your local changes. It provides an application built with vite that has 3 different routes.

The components rendered in each route are lazy loaded to demonstrate how the `.affected-files` file collects only the files that are related to the executed E2E test.

Note: The generated files in the .affected-files have been harcoded so that the relative path matches what `git diff` returns. This logic needs to be improved but in the meantime it is not allowed to commit any changes made to those files to keep the playground operative.

# Setup

Run `npm ci` to install the dependencies.

# Executing E2E tests with playwright-related-test

Start the dev server by running `npm run dev`, make some changes to any of the components and then execute the E2E tests with `npm run e2e`. Only the affected tests should be executed.

# Quick way of testing new changes made to the library

In the root dir (`cd ../..`) you could also run `npm run playground:test` which will run a script that modifies the `Home.tsx` component which is included in one of the files in `.affected-files`, and then runs the E2E, resulting in only the `home.spec.js` test being executed.

