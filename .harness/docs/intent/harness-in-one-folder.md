## Problem

A team mate that installed the harness found a lot of files that change completely the structure of the codebase he used to have control. Just to have a harness that is a tool to help develop not to change the repo structure at all.

## What success looks like

The idea is to have everything under a dot folder .harness and ideally .gitignored. Probably we'll have to have tracked a folder .harness/docs and the stamp.json, one for the history for agents, the other for the harness versioning itself.

The best result is that a team member installs the "harness" and the repo remains pretty the same. Because now they can already have a scripts/ or docs/ folder for other purposes.

## Out of scope

What is outside this field.
