#!/usr/bin/env bash
#
# Publishes packaged binaries to Github Release
#

set -euo pipefail

USER="viswiz-io"
PROJECT="viswiz-cli"
VERSION=$(node -p "require('./package.json').version")
SUFFIXES=('alpine' 'linux' 'macos' 'win.exe')

rm -rf pkg/*
yarn build-pkg
for SUFFIX in ${SUFFIXES[@]}; do
	mv -f pkg/viswiz-${SUFFIX} pkg/viswiz-${VERSION}-${SUFFIX}
done

github-release upload \
	--token "$GH_TOKEN" \
	--owner "$USER" \
	--repo "$PROJECT" \
	--tag "$TRAVIS_TAG" \
	pkg/*
