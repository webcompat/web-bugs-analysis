import { createServer, IncomingMessage } from "http";

import { createClient as RedisCreateClient } from "redis";

const REDIS_URL_QUEUE = process.env.REDIS_URL_QUEUE;
const RedisClient = RedisCreateClient({ url: REDIS_URL_QUEUE });

function getRequestBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body: any[] = [];
    request
      .on("data", (chunk) => {
        body.push(chunk);
      })
      .on("end", () => {
        resolve(Buffer.concat(body).toString());
      });
  });
}

(async () => {
  await RedisClient.connect();
  const httpServer = createServer(async (req, res) => {
    if (req.method != "POST" || req.url != "/github/receive") {
      res.statusCode = 404;
      res.end();
      return;
    }

    try {
      const body = JSON.parse(await getRequestBody(req));
      const bugNumber = body?.issue?.number;
      if (bugNumber != undefined) {
        const currentTimestamp = Math.floor(new Date().getTime() / 1000);
        RedisClient.set(`download:${bugNumber}`, currentTimestamp.toString());
      }
    } catch (ex) {
      console.error(ex);
      res.statusCode = 500;
    }

    res.end();
  });

  httpServer.listen(8080, "0.0.0.0");
})();
