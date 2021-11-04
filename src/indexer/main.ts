import { existsSync, readFileSync } from "fs";

import { createClient as RedisCreateClient } from "redis";
import { Client as ElasticsearchClient } from "@elastic/elasticsearch";

const REDIS_URL_QUEUE = process.env.REDIS_URL_QUEUE;
const RedisClient = RedisCreateClient({ url: REDIS_URL_QUEUE });

let esConfig: any = { node: process.env.ELASTIC_NODE };
if (!!process.env.ELASTIC_API_KEY) {
  esConfig["auth"] = { apiKey: process.env.ELASTIC_API_KEY };
}
const ElasticClient = new ElasticsearchClient(esConfig);

async function DeleteBug(bugNumber: number) {
  try {
    await ElasticClient.deleteByQuery({
      index: "issues",
      body: { query: { match: { bug_number: bugNumber } } },
    });

    await ElasticClient.deleteByQuery({
      index: "timelines",
      body: { query: { match: { bug_number: bugNumber } } },
    });
  } catch {}
}

async function IndexBug(bugNumber: number, issueData: any, timelineData: any) {
  await ElasticClient.index({
    index: "issues",
    body: Object.assign({}, issueData, { bug_number: bugNumber }),
  });

  for (const timelineEvent of timelineData) {
    await ElasticClient.index({
      index: "timelines",
      body: Object.assign({}, timelineEvent, { bug_number: bugNumber }),
    });
  }
}

(async () => {
  async function PollLoop() {
    try {
      const queue = await RedisClient.keys("index:*");
      if (queue.length > 0) {
        for (const queueKey of queue) {
          const bugNumber = parseInt(queueKey.split(":")[1], 10);
          console.log(`Indexing web-bug #${bugNumber}...`);

          /*
           * We first delete all the data, and then reindex it - but only if the folder still exists. This isn't the most
           * performant solution, but since we know we fire add an index queue item on issue deletion, this is the
           * simplest implementation.
           */
          await DeleteBug(bugNumber);

          const rootDir = `/data/current/${bugNumber}/`;
          if (existsSync(rootDir)) {
            let issueData = JSON.parse(readFileSync(rootDir + "issue.json").toString());
            let timelineData = JSON.parse(readFileSync(rootDir + "timeline.json").toString());
            await IndexBug(bugNumber, issueData, timelineData);
          }

          await RedisClient.del(queueKey);
        }
      }

      setTimeout(PollLoop, 10000);
    } catch (ex) {
      /*
       * This is an async function inside an async timeout. NodeJS likes to just throw exceptions and then be silent,
       * no longer doing anything, but also not exiting. Let's throw the exception and kill the process, so that
       * Docker notices that and can trigger monitoring.
       */
      console.error(ex);
      process.exit(1);
    }
  }

  await RedisClient.connect();
  setImmediate(PollLoop);
})();
