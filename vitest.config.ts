import { defineConfig } from 'vitest/config'

// Only tests/: the templates dir holds architecture.test.ts, a template with
// placeholders that is copied into project repos, not a test of this repo.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Not the 5000 ms default: most tests here build a real git repo, with
    // `git init`, commits and the hooks installed, and that costs seconds.
    // Under load the default failed at random, on a different test each time,
    // and a subagent of /next has no way to tell that red from a real one.
    // Twenty seconds is still a wait someone sits through, so a hung test
    // fails while you are watching instead of hiding behind the number.
    testTimeout: 20_000,
  },
})
