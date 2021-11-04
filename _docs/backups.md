# Backups

An overview of what data needs to be backupped, and how to do it.

## web-bug Data

It is recommended to backup the entire `/data` directory, which contains both live data, but also snapshots. If you want to avoid checking and backupping too many individual files, you can either `tar` the entire `/data/current/` folder, or skip it entirely and only backup snapshots.

If you decide to only back snapshots, please make sure that snapshots are actually created.

## ElasticSearch + Kibana

At the moment, data stored in ElasticSearch is not backupped. This will change in the future, and this documentation will be updated. As we can recover all ElasticSearch bug indexes from the JSON archive, this is not super critical, and thus is not done yet.

Data like ElasticSearch users, API keys, Kibana configuration, Kibana dashboards, ... are also stored in ElasticSearch.
