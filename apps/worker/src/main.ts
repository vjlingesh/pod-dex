import { loadEnv } from "@pod-dex/env";
import { checkQueueHealth, closeConnection } from "@pod-dex/queue";

loadEnv();

async function main() {
  const redisOk = await checkQueueHealth();
  if (!redisOk) throw new Error("cannot reach Redis — is the infra up? (make infra)");

  console.log("worker online; waiting for jobs");
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void closeConnection().then(() => process.exit(0));
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
