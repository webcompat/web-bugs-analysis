# Data Flow

The following chart provides an overview of how bug data is downloaded, processed, stored, and how it is accessible.

```
  ┌─────────────────────────────┐  ╔══════════════════════════════╗
  │ GitHub Webhook Notification │  ║ queue-cli add download 12345 ║
  └───────────────┬─────────────┘  ╚══════════════════════════════╝
                  │                                │
                  ▼
        ┌──────────────────┐                       │
        │ webhook-receiver │
        └─────────┬────────┘                       │
                  └───────────────┬ ─ ─ ─ ─ ─ ─ ─ ─
                                  │
                                  ▼
  ┌───────────────────────────────────────────────────────────────┐
  │                          redis queue                          │
  │                                                               │
  │                        download:12345                         │
  └───────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
  ┌───────────────────────────────────────────────────────────────┐
  │                          downloader                           │
  └───────────────────────────────┬───────────────────────────────┘
                                  │
              ┌───────────────────┤
              ▼                   │
  ┌───────────────────────┐       │
  │      .json files      │       │   ╔═══════════════════════════╗
  │                       │       │   ║ queue-cli add index 12345 ║
  │   /12345/issue.json   │       │   ╚═══════════════════════════╝
  │ /12345/timeline.json  │       │                 │
  └─┬─────────────────────┘       │─ ─ ─ ─ ─ ─ ─ ─ ─
    │                             ▼
    │  ┌──────────────────────────────────────────────────────────┐
    │  │                       redis queue                        │
    │  │                                                          │
    │  │                       index:12345                        │
    │  └──────────────────────────┬───────────────────────────────┘
    │                             │
    │                             ▼
    │  ┌──────────────────────────────────────────────────────────┐
    ├─▷│                         indexer                          │
    │  └──────────────────────────┬───────────────────────────────┘
    │                             │
    │                             ▼
    │  ┌──────────────────────────────────────────────────────────┐
    │  │                      ElasticSearch                       │
    │  └──────────────────────────┬───────────────────────────────┘
    │                             └─────────┬─────────────────┐
    │                                       ▼                 ▼
    │  ┏━━━━━━━━━━━━━━━━━━━━━━━┓  ┏━━━━━━━━━━━━━━━━━━━┓  ┏━━━━━━━━┓
    └─▷┃ HTTP /data/current/.. ┃  ┃ ElasticSearch API ┃  ┃ Kibana ┃
       ┗━━━━━━━━━━━━━━━━━━━━━━━┛  ┗━━━━━━━━━━━━━━━━━━━┛  ┗━━━━━━━━┛
```
