import Redis from "ioredis";
import logger from "../utils/logger.js";

const redis = new Redis({
  host: "expert-grubworm-40629.upstash.io",
  port: 6379,
  username: "default",
  password: "AZ61AAIncDFlMDViYWFkYzJhZDg0MTlhODlmMWQwZDY0ZmUzYWY3ZHAxNDA2Mjk",
  tls: {
    servername: "expert-grubworm-40629.upstash.io", // 🔥 VERY IMPORTANT
  },
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    if (times > 5) {
      logger.error("Redis retry limit reached.");
      return null;
    }
    return Math.min(times * 200, 2000);
  },
});

redis.on("connect", () => {
  logger.info("Redis Connected Successfully!!");
});

redis.on("ready", () => {
  logger.info("Redis Ready");
});

redis.on("error", (error) => {
  logger.error(`Redis Error: ${error.message}`);
});

redis.on("reconnecting", () => {
  logger.warn("Redis reconnecting...");
});

export default redis;