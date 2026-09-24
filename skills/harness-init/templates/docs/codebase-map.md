# Code map

> One screen. The only living document of the repo: it is updated when the shape of the code changes, not at every PR. Updated on {{YYYY-MM-DD}}.

## What it is

{{One line.}}

## Modules

| Path                | What it owns              | Entry point  |
| ------------------- | ------------------------- | ------------ |
| {{src/lib/engine/}} | {{pure domain, no React}} | {{index.ts}} |

## Data flow

{{Three lines: where an event comes in, where the state lives, how it reaches the screen.}}

## How it runs and how it is tested

{{pm}} dev · {{pm}} test · {{pm}} typecheck · {{pm}} format:check · {{pm}} build
{{Where the tests are, what they cover, what they do not.}}

## Dragons

- {{What breaks easily, what is not obvious, what is not touched without a spec.}}
