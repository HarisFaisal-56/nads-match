# Git rules for this repo

- Commit as HarisFaisal-56 <harisfaisal365@gmail.com>. Before the first commit in a session run:
  `git config user.name "HarisFaisal-56"` and `git config user.email "harisfaisal365@gmail.com"`
- Never add `Co-Authored-By`, `Claude-Session` or any other Claude/AI attribution line to commit messages or PR descriptions.
- Before pushing, check that no commit carries Claude's name or email:
  `git log origin/main..HEAD --format="%an | %ae | %b" | grep -i claude` must print nothing.
