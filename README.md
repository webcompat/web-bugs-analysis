# web-bugs-analysis

A complete service stack that enables the WebCompat team to

- have a copy of all issue data outside of GitHub
- analyze issue data without being bound to GitHubs API rate limits
- have bug data available in ElasticSearch for more powerful querying
- have the ability to build dashboards and data visualisations in Kibana

## Documentation

For brevity, the documentation of this project is split into multiple files:

- [`_docs/architecture.md`](_docs/architecture.md): A collection of topics around how this application is designed, and why certain parts of it were designed the way they are.
- [`_docs/available-data.md`](_docs/available-data.md): Explains what data is available, and where to find it.
- [`_docs/backups.md`](_docs/backups.md): An overview over what data needs to be backupped, and how to do it.
- [`_docs/components.md`](_docs/components.md): An overview of all the components in this repo, and related components needed to run this service.
- [`_docs/data-flow.md`](_docs/data-flow.md): A chart providing an overview over how bug data is downloaded, processed, stored, and how it is accessible.
- [`_docs/deployment.md`](_docs/deployment.md): How to get this stack up and running.
- [`_docs/queue-cli.md`](_docs/queue-cli.md): An overview over the `queue-cli` command, and what you can do with it.
