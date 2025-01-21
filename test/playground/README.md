# Playwright related tests playground

This playground will allow you to test your local changes. It provides an application built with vite that has 3 different routes. 

The components rendered in each route are lazy loaded to demonstrate how the .affected-files will collect only the files that are related to the executed E2E test.

# Setup

Run `npm ci` to install the dependencies.

# Executing E2E tests with playwright

Start the dev server by running `npm run dev` and then execute the E2E tests with `npm run e2e`.
