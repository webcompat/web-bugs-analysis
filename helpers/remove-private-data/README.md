# `remove-private-data` helper

Removes bugs with private data from a snapshot directory. Useful when, for example, redistributing a snapshot folder to the public, where we need to remove private bug data.

This tool iterates over a snapshot directory, and removes all data from issues that have the `__WEBCOMPAT_PRIVATE_ISSUE__` flag set, see [the documentation about the data format](/_docs/available-data.md).

## Requirements

To build this tool, you need to have a recent `rustc` and `cargo` version installed. This was built and tested with `1.61.0`.

## Usage

This tool does not work on a snapshot archive, you need to extract the snapshot into a directory. Then, run

```bash
cargo run -r -- --root-dir ~/Downloads/path/to/snapshot/20220530_0038/
```

or similar. The tool will iterate over all issues and remove data if needed. Note that a full snapshot contains more than 100k issues, so this might take a bit!
