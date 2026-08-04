import { initNew } from "./init-new.mjs";
import { discoverExisting } from "./discover-existing.mjs";

export async function onboardExisting({ target, agent, workflow }) {
  const discovery = discoverExisting(target);
  const plan = await initNew({
    target: discovery.target,
    agent,
    workflow,
    dryRun: true,
  });

  return {
    target: discovery.target,
    agent,
    workflow,
    discovery,
    proposedCreates: plan.created,
    blockedExisting: plan.blocked,
    complete: plan.created.length === 0,
  };
}
