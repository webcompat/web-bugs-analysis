import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";

import { createClient as RedisCreateClient } from "redis";
import { Octokit } from "octokit";
import { throttling } from "@octokit/plugin-throttling";

const BUG_INACTIVITY_DELAY = parseInt(process.env.BUG_INACTIVITY_DELAY!, 10);
const GITHUB_ORG = process.env.GITHUB_ORG!;
const GITHUB_PERSONAL_ACCESS_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN!;
const GITHUB_REPO_PRIVATE = process.env.GITHUB_REPO_PRIVATE!;
const GITHUB_REPO_PUBLIC = process.env.GITHUB_REPO_PUBLIC!;
const REDIS_URL_QUEUE = process.env.REDIS_URL_QUEUE;

// If those strings matches the title of an issue exactly, we'll fetch it's
// details from the private repo. This is done to get data from issues that have
// been auto-moderated, or issues that are awaiting moderation.
const PRIVATE_TRIGGER = ["In the moderation queue.", "Issue closed."];

const RedisClient = RedisCreateClient({ url: REDIS_URL_QUEUE });

const ThrottledOctokit = Octokit.plugin(throttling);
const GithubClient = new ThrottledOctokit({
  auth: GITHUB_PERSONAL_ACCESS_TOKEN,
  userAgent: "web-bugs-analysis/downloader",
  throttle: {
    onRateLimit: (retryAfter: any, options: any) => {
      GithubClient.log.warn(`Quota exhausted: ${options.method} ${options.url}`);
      if (options.request.retryCount <= 5) {
        console.log(`Retrying in ${retryAfter}s ...`);
        return true;
      }
    },
    onAbuseLimit: (_: any, options: any) => {
      GithubClient.log.warn(`Abuse detected: ${options.method} ${options.url}`);
    },
  },
});

async function Download(bugNumber: number) {
  console.log(`Downloading web-bug #${bugNumber}...`);
  const targetDirectory = "/data/current/" + bugNumber.toString();

  try {
    const queryData = {
      owner: GITHUB_ORG,
      repo: GITHUB_REPO_PUBLIC,
      issue_number: bugNumber,
      per_page: 100,
    };

    let issueData = await GithubClient.rest.issues.get(queryData);

    const timelinePaginator = GithubClient.paginate.iterator(GithubClient.rest.issues.listEventsForTimeline, queryData);
    let timelineData = [];
    for await (const { data: events } of timelinePaginator) {
      timelineData.push(...events);
    }

    // If the issue has one of the titles that indiciate it's still private, use the title and body from the linked
    // private bug, which convinently all exists in the timeline data.
    const shouldUsePrivateContents = PRIVATE_TRIGGER.some((triggerTitle) => issueData.data.title == triggerTitle);
    if (shouldUsePrivateContents) {
      const privateBugLink = timelineData.find(
        (eventData: any) =>
          eventData.event == "cross-referenced" && eventData?.source?.issue?.repository?.name == GITHUB_REPO_PRIVATE
      );
      if (privateBugLink?.source?.issue !== undefined) {
        const privateBug = privateBugLink.source.issue;
        issueData.data.title = privateBug.title;
        issueData.data.body = privateBug.body;
        (issueData as any).data.__WEBCOMPAT_PRIVATE_ISSUE__ = true;
      }
    }

    if (!existsSync(targetDirectory)) {
      mkdirSync(targetDirectory);
    }
    writeFileSync(`${targetDirectory}/issue.json`, JSON.stringify(issueData.data));
    writeFileSync(`${targetDirectory}/timeline.json`, JSON.stringify(timelineData));
  } catch (ex: any) {
    // If an issue got into the queue but is now 404'ing, the issue has been deleted - so let's remove it.
    if (ex.status && (ex.status == 404 || ex.status == 410)) {
      rmSync(targetDirectory, { force: true, recursive: true });
    } else {
      console.log(ex);
    }
  }

  await RedisClient.set(`index:${bugNumber}`, "0");
}

(async () => {
  async function PollLoop() {
    try {
      const queue = await RedisClient.keys("download:*");
      if (queue.length > 0) {
        const currentTimestamp = Math.floor(new Date().getTime() / 1000);
        for (const queueKey of queue) {
          const queuedTimestamp = parseInt((await RedisClient.get(queueKey)) ?? "0", 10);
          if ((queuedTimestamp - currentTimestamp) * -1 < BUG_INACTIVITY_DELAY) {
            continue;
          }

          await Download(parseInt(queueKey.split(":")[1], 10));
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
