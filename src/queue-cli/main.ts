import { createClient as RedisCreateClient } from "redis";
import { Octokit } from "octokit";

const GITHUB_ORG = process.env.GITHUB_ORG!;
const GITHUB_PERSONAL_ACCESS_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN!;
const GITHUB_REPO_PUBLIC = process.env.GITHUB_REPO_PUBLIC!;
const REDIS_URL_QUEUE = process.env.REDIS_URL_QUEUE;

const RedisClient = RedisCreateClient({ url: REDIS_URL_QUEUE });

const GithubClient = new Octokit({
  auth: GITHUB_PERSONAL_ACCESS_TOKEN,
  userAgent: "web-bugs-analysis/queue-cli",
});

(async () => {
  await RedisClient.connect();

  const args = process.argv.splice(2);
  switch (args[0]) {
    case "add": {
      if (args.length != 3) {
        console.log(`USAGE: add [queue] [bugNumber]`);
        break;
      }
      await RedisClient.set(`${args[1]}:${args[2]}`, "0");
      break;
    }

    case "add-range": {
      if (args.length != 4) {
        console.log(`USAGE: add-range [queue] [bugNumber start] [bugNumber end]`);
        break;
      }

      const bugStart = parseInt(args[2], 10);
      const bugEnd = parseInt(args[3], 10);
      for (let i = bugStart; i <= bugEnd; i++) {
        await RedisClient.set(`${args[1]}:${i}`, "0");
      }
      break;
    }

    case "add-updated-since": {
      if (args.length != 3) {
        console.log(`USAGE: add-updated-since [queue] [timestamp as ISO 8601 (YYYY-MM-DDTHH:MM:SSZ)]`);
        break;
      }

      const issueIterator = GithubClient.paginate.iterator(GithubClient.rest.issues.listForRepo, {
        owner: GITHUB_ORG,
        repo: GITHUB_REPO_PUBLIC,
        state: "all",
        per_page: 100,
        since: args[2],
      });

      for await (const response of issueIterator) {
        for (const issue of response.data) {
          await RedisClient.set(`${args[1]}:${issue.number}`, "0");
        }
      }

      break;
    }

    case "length": {
      if (args.length != 2) {
        console.log(`USAGE: length [queue]`);
        break;
      }

      const queueContents = await RedisClient.keys(`${args[1]}:*`);
      console.log(`${args[1]}.length = ${queueContents.length}`);
      break;
    }

    case "purge": {
      if (args.length != 2) {
        console.log(`USAGE: purge [queue]`);
        break;
      }

      const queueContents = await RedisClient.keys(`${args[1]}:*`);
      await RedisClient.del(queueContents);
      break;
    }

    case "noop":
      break;

    default:
      console.log(`ERROR: unknown command '${args[0]}'`);
      break;
  }

  process.exit(0);
})();
