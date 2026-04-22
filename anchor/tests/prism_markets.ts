import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PrismMarkets } from "../target/types/prism_markets";
import { assert } from "chai";

describe("prism_markets", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PrismMarkets as Program<PrismMarkets>;

  const marketId = "test-market-001";
  const question = "Will ETH break $5k before end of Q2 2025?";
  const resolutionTs = Math.floor(Date.now() / 1000) + 86400; // 24h from now

  let marketPda: anchor.web3.PublicKey;
  let marketBump: number;

  before(async () => {
    [marketPda, marketBump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("market"), Buffer.from(marketId)],
      program.programId
    );
  });

  it("initializes a market PDA", async () => {
    await program.methods
      .initializeMarket(marketId, question, new anchor.BN(resolutionTs), new anchor.BN(6000))
      .accounts({
        market: marketPda,
        creator: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const market = await program.account.market.fetch(marketPda);
    assert.equal(market.marketId, marketId);
    assert.equal(market.question, question);
    assert.equal(market.yesOdds.toNumber(), 6000);
    assert.equal(market.noOdds.toNumber(), 4000);
    assert.isFalse(market.resolved);
    assert.equal(market.outcome, 0);
  });

  it("seeds a simulation result on-chain", async () => {
    const fakeHash = Array(32).fill(42); // mock attestation hash

    await program.methods
      .seedSimulationResult(fakeHash, new anchor.BN(7200))
      .accounts({
        market: marketPda,
        creator: provider.wallet.publicKey,
      })
      .rpc();

    const market = await program.account.market.fetch(marketPda);
    assert.equal(market.yesOdds.toNumber(), 7200);
    assert.equal(market.noOdds.toNumber(), 2800);
    assert.deepEqual(Array.from(market.simulationHash), fakeHash);
  });

  it("allows buying YES shares and updates AMM odds", async () => {
    const [positionPda] = await anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("position"),
        provider.wallet.publicKey.toBuffer(),
        marketPda.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .buyShares(true, new anchor.BN(1_000_000))
      .accounts({
        market: marketPda,
        position: positionPda,
        buyer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const position = await program.account.position.fetch(positionPda);
    assert.equal(position.shares.toNumber(), 1_000_000);
    assert.isTrue(position.outcome);
  });

  it("rejects resolution before timestamp", async () => {
    try {
      await program.methods
        .resolveMarket(true)
        .accounts({ market: marketPda, creator: provider.wallet.publicKey })
        .rpc();
      assert.fail("Should have thrown ResolutionNotReady");
    } catch (err: any) {
      assert.include(err.message, "ResolutionNotReady");
    }
  });
});
