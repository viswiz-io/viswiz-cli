# VisWiz.io CLI

> The official VisWiz.io CLI.

[![Travis branch](https://img.shields.io/travis/viswiz-io/viswiz-cli/master.svg?style=flat-square)](https://travis-ci.org/viswiz-io/viswiz-cli)
[![NPM version](https://img.shields.io/npm/v/viswiz.svg?style=flat-square)](https://www.npmjs.com/package/viswiz)
[![Dependencies](https://img.shields.io/david/viswiz-io/viswiz-cli.svg?style=flat-square)](https://david-dm.org/viswiz-io/viswiz-cli)
[![Install size](https://packagephobia.now.sh/badge?p=viswiz)](https://packagephobia.now.sh/result?p=viswiz)

Welcome to the [VisWiz.io](https://www.viswiz.io/) CLI documentation.

The CLI allows you to query and create new projects, builds or images within the VisWiz.io service.


## Installation

Install the module using `yarn`:

```
$ yarn add -D viswiz
```

Or using `npm`:

```
$ npm install -D viswiz
```

Alternatively, you can install a prepackaged binary for your OS. Download binaries from the
[Releases](https://github.com/viswiz-io/viswiz-cli/releases) page.

## Configuration

The following environment keys are used when their corresponding flags are missing:

- `VISWIZ_API_KEY` - for the `api-key` flag
- `VISWIZ_PROJECT_ID` - for the `project` flag

CI environment variables for popular [CI services](https://www.npmjs.com/package/env-ci#supported-ci)
are also used for the `branch`, `message` and `revision` flags.

## Options

```
$ viswiz --help
Usage: viswiz [options] [command]

Options:
  -V, --version              output the version number
  -k, --api-key [apiKey]     The API key of a VisWiz account to use. Defaults to VISWIZ_API_KEY env.
  -p, --project [projectID]  The ID of a VisWiz project to use. Defaults to VISWIZ_PROJECT_ID env.
  -h, --help                 output usage information

Commands:
  build [options]            Creates a new build on VisWiz.io and sends images for regression testing.

```

### `build` options

```
$ viswiz build --help
Usage: viswiz build [options]

Creates a new build on VisWiz.io and sends images for regression testing.

Options:
  -i, --image-dir <path>           The path to a directory (scanned recursively) with images used for the build.
  -b, --branch [branch name]       The branch name for the build. Auto-detected on popular CIs.
  -m, --message [commit message]   The commit message for the build. Auto-detected on popular CIs.
  -r, --revision [rev]             The revision for the build. Auto-detected on popular CIs.
  -w, --wait-for-result [timeout]  Whether to wait for the result of the build comparison (disabled by default). Waits for a maximum number of seconds (defaults to 600).
  -h, --help                       output usage information
```

## Usage

On popular [CI services](https://www.npmjs.com/package/env-ci#supported-ci), assuming
`VISWIZ_API_KEY` and `VISWIZ_PROJECT_ID` values are configured in the CI environment:

```
$ viswiz build --image-dir ./path/to/images/directory
```

## Changelog

The changelog can be found here:
[CHANGELOG.md](https://github.com/viswiz-io/viswiz-cli/blob/master/CHANGELOG.md#readme).

## Authors and license

Author: [VisWiz.io](https://www.viswiz.io/).

MIT License, see the included
[LICENSE.md](https://github.com/viswiz-io/viswiz-cli/blob/master/LICENSE.md)
file.
