# Architectural notes

A collection of topics around how this application is designed, and why certain parts of it were designed the way they are.

## `BUG_INACTIVITY_DELAY`, and why there is a queue

Frequently, our workflow results in multiple changes to a web-bug in short succession. For example, when diagnosing is done, a comment is written, labels are updated, and the milestone is changed. The GitHub webhook system will deliver three individual events for this. If we would immediately download an issue for each event, we do a lot of unnecessary work and API calls.

Instead, when receiving a webhook from GitHub, we just put the issue into a queue for downloading, along with a timestamp. This timestamp gets updated on every successive webhook notification received for that issue. The downloading and indexing is only started when the issue has been in the queue for more than `BUG_INACTIVITY_DELAY` seconds without new activity. This significantly reduces the number of API calls we have to make, and the number of index updates we have to process.

## No partial/incremental data updates

Instead of trying to update existing JSON files and index entries, we do delete and re-add individual issues every time they are updated. This might not be the most efficient implementation in terms of resource usage, but the resulting code is much simpler and easier to maintain, as we are always "just" downloading the full API response from GitHub and storing that.

This has the theoretical downside that, if GitHub's API response format changes, the data stored and indexed has an inconsistent format. In practice, the downloader is using GitHub's versioned API, and it's unlikely they'll do breaking changes to that. Even if the data format changes, we can queue all issues for re-downloading. Downloading all issues again will take a couple of days due to the rate-limiting imposed by GitHub, but inconsistent data is not a state we cannot recover from.

## Dealing with deleted issues

When we decide an issue violates our Acceptable Use Policy, we delete the issue on GitHub. This results in the GitHub API responding with a `410 Gone` response. The same happens for issues created by spambots that have been removed by GitHub.

Because all download and index operations start with all data about an issue being removed first (see above), this results in the issue being removed from the JSON archive and the ElasticSearch instance. This is not a bug, but rather a deliberate decision. If we delete an issue from our GitHub repo, there is no reason to keep the issue's data in our copy. In case an issue has been deleted by accident, the issue is still recoverable from the daily snapshots (if the issue existed for long enough to be included in a snapshot).
