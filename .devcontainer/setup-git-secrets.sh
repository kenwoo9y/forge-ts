#!/bin/bash
set -e

# Install git-secrets if it is not available yet
if ! command -v git-secrets >/dev/null 2>&1; then
  tmp_dir=$(mktemp -d)
  git clone --depth 1 https://github.com/awslabs/git-secrets.git "$tmp_dir"
  (cd "$tmp_dir" && sudo make install)
  sudo chmod 755 "$(command -v git-secrets || echo /usr/local/bin/git-secrets)"
  rm -rf "$tmp_dir"
fi

# Register the AWS rule set in this repository's git config.
# Safe to re-run: git-secrets skips patterns that are already registered.
# Git hooks are managed by Lefthook, so `git secrets --install` is intentionally not used.
git secrets --register-aws
