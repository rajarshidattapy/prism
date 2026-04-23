#!/usr/bin/env bun
/**
 * Deploy a PRISM job to Nosana.
 *
 * Usage:
 *   bun scripts/deploy_nosana.ts --job agent         # Deploy 24/7 ElizaOS agent
 *   bun scripts/deploy_nosana.ts --job simulation \
 *     --question "Will ETH break $5k?" \
 *     --context "ETF approval imminent" \
 *     --market-pda <PDA>
 */

import { readFileSync } from "fs";
import { join } from "path";

const NOSANA_API = "https://api.nosana.io";
const NOS_JOB_DIR = join(import.meta.dir, "..", "nos_job_def");

interface DeployArgs {
  job: "agent" | "simulation";
  question?: string;
  context?: string;
  marketPda?: string;
}

function parseArgs(): DeployArgs {
  const args: DeployArgs = { job: "agent" };
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--job") args.job = argv[++i] as DeployArgs["job"];
    if (argv[i] === "--question") args.question = argv[++i];
    if (argv[i] === "--context") args.context = argv[++i];
    if (argv[i] === "--market-pda") args.marketPda = argv[++i];
  }
  return args;
}

async function deploy(args: DeployArgs) {
  const apiKey = process.env.NOSANA_API_KEY;
  if (!apiKey) {
    console.error("[Nosana] NOSANA_API_KEY not set in environment.");
    process.exit(1);
  }

  const jobFile = args.job === "simulation" ? "oasis_simulation.json" : "prism_agent.json";
  const jobDef = JSON.parse(readFileSync(join(NOS_JOB_DIR, jobFile), "utf-8"));

  // Inject runtime inputs for simulation job
  if (args.job === "simulation") {
    if (!args.question) {
      console.error("[Nosana] --question required for simulation job.");
      process.exit(1);
    }
    console.log(`[Nosana] Deploying simulation: "${args.question}"`);
  } else {
    console.log("[Nosana] Deploying PRISM agent (24/7 monitor)...");
  }

  const body = {
    jobDefinition: jobDef,
    market: process.env.NOSANA_MARKET,
    inputs:
      args.job === "simulation"
        ? {
            MARKET_QUESTION: args.question,
            MARKET_CONTEXT: args.context ?? "",
            MARKET_PDA: args.marketPda ?? "",
          }
        : {},
  };

  try {
    const res = await fetch(`${NOSANA_API}/api/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[Nosana] Deploy failed (${res.status}): ${err}`);
      process.exit(1);
    }

    const data: any = await res.json();
    console.log(`[Nosana] Job deployed successfully!`);
    console.log(`  Job ID:  ${data.id ?? data.jobId}`);
    console.log(`  Status:  ${data.state ?? "QUEUED"}`);
    console.log(`  Dashboard: https://app.nosana.io/jobs/${data.id ?? data.jobId}`);
  } catch (err: any) {
    console.error(`[Nosana] Network error: ${err.message}`);
    process.exit(1);
  }
}

deploy(parseArgs());
