# `queue-cli`

The `queue-cli` is a command that allows you to manually control the queue, and with that everything the service stack does.

Note: Currently, there are currently two queues. One for download jobs, with the name `download`, and one for index jobs, called `index`.

## Adding a single bug to the queue

To add a single bug to the queue, you can use

```
docker-compose run --rm queue-cli add [download|index] [bug number]
```

Example, which downloads issue `91234` (which also adds an index job after it's been downloaded):

```
docker-compose run --rm queue-cli add download 91234
```

This is useful to download and re-index a single issue, for experimentation, or to fix an issue with lost data.

## Adding a range of bugs to the queue

```
docker-compose run --rm queue-cli add-range [download|index] [start bug number] [end bug number]
```

Example, which indexes all bugs from `1` to `91234`:

```
docker-compose run --rm queue-cli add-range index 1 91234
```

This is useful to download the entire repo, or to index data you've restored from a backup or snapshot.

## Add issues updated since a certain timestamp to the queue

```
docker-compose run --rm queue-cli add-updated-since [queue] [timestamp as ISO 8601 (YYYY-MM-DDTHH:MM:SSZ)]
```

Example, which would queue all issues updated since UTC-midnight on December 1st, 2021 for download:

```
docker-compose run --rm queue-cli add-updated-since download 2021-12-01T00:00:00Z
```

## Getting the length of a queue

```
docker-compose run --rm queue-cli length [download|index]
```

Example, which prints the number of issues still queued for download:

```
docker-compose run --rm queue-cli length download
```

This is useful if you started a long-running range job and want to check how many issues still need processing.

## Purging a queue

```
docker-compose run --rm queue-cli purge [download|index]
```

Example, which removes all download jobs still queued:

```
docker-compose run --rm queue-cli purge download
```

This is useful if you started a long-running job by accident and want to cancel it.
