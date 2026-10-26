# Project Guidelines

This project watches a specified folder for changes and automatically deploys the updated static assets to a Cloudflare Worker.

## Architecture

- This is a Node.js + TypeScript project.
- The project uses Cloudflare Workers for deployment of static assets.
- The project supports both direct Node.js execution and containerized deployment.
- src/watcher.ts:
  - Sets up a file watcher, deployer, and wrangler function to push to Cloudflare.
  - The watcher notifies the deployer on changes to trigger the wrangler function.
- src/deployer.ts:
  - Handles debounced, single-flight deployment with retry logic.

## Code Style

- Use TypeScript for all source files.
- Prefer `const` over `let` where possible.
- Use camelCase for variable and function names.
- Use PascalCase for class and type names.
- Use descriptive names for variables, functions, and classes.
- Use single quotes for strings.
- End all statements with semicolons.
- Use async/await for asynchronous code.
- Include JSDoc comments for all public functions and classes.

## Build

- The compiled files are output to the `dist` directory.
- Ensure all dependencies are installed before building the project.
- Use `npm run build` to trigger the build process.
- Use `npm start` to run the project locally, exit with `Ctrl+C` or SIGINT/SIGTERM when done.

## Test

- Add tests for all public functions and classes to ensure proper functionality.
- Use `npm test` to execute the test suite.
- Tests are written with native Node.js test framework.
- Test files should be placed in the `tests` directory and follow the naming convention `*.test.ts`.
- Use descriptive names for test files to indicate the functionality being tested.

## Docker

- Support containerized deployment via Docker in addition to direct Node.js execution.
- Dockerfile uses node:alpine as the base image to build the project and as a base image for the final container.
- docker-compose.yml configures the services, environment, network, and volumes for the containerized deployment.
- .env.example provides an example environment configuration for the project.

## CI

- GitHub workflows are used for continuous integration and deployment.
- ./github/workflows/build.yml defines the build and test workflow for the project.
- Ensure that the workflows are triggered on appropriate events such as push and pull request.