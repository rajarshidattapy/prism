use anchor_lang::prelude::*;

declare_id!("PRiSMVzV9vV1GqSsGaijT9tCGANWGFCj9yXv5x8vFJ3");

#[program]
pub mod prism_markets {
    use super::*;

    /// Initialize a new prediction market PDA.
    /// Called by `prism create` via the ElizaOS plugin-prism.
    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        market_id: String,
        question: String,
        resolution_timestamp: i64,
        initial_yes_odds: u64, // basis points — 6000 = 60%
    ) -> Result<()> {
        require!(market_id.len() <= 64, PrismError::FieldTooLong);
        require!(question.len() <= 256, PrismError::FieldTooLong);
        require!(initial_yes_odds <= 10000, PrismError::InvalidOdds);

        let market = &mut ctx.accounts.market;
        market.creator = ctx.accounts.creator.key();
        market.market_id = market_id;
        market.question = question;
        market.resolution_timestamp = resolution_timestamp;
        market.yes_odds = initial_yes_odds;
        market.no_odds = 10000u64.saturating_sub(initial_yes_odds);
        market.yes_liquidity = 0;
        market.no_liquidity = 0;
        market.resolved = false;
        market.outcome = 0; // 0 = unresolved, 1 = YES, 2 = NO
        market.simulation_hash = [0u8; 32];
        market.bump = ctx.bumps.market;

        emit!(MarketCreated {
            market_id: market.market_id.clone(),
            creator: market.creator,
            question: market.question.clone(),
            yes_odds: market.yes_odds,
        });

        Ok(())
    }

    /// Post a verifiable simulation result from Nosana/MiroFish on-chain.
    /// The hash is the SHA-256 of the simulation output, proving the run.
    pub fn seed_simulation_result(
        ctx: Context<SeedSimulation>,
        simulation_hash: [u8; 32],
        yes_probability: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(!market.resolved, PrismError::AlreadyResolved);
        require!(yes_probability <= 10000, PrismError::InvalidOdds);

        market.simulation_hash = simulation_hash;
        market.yes_odds = yes_probability;
        market.no_odds = 10000u64.saturating_sub(yes_probability);

        emit!(SimulationSeeded {
            market_id: market.market_id.clone(),
            simulation_hash,
            yes_probability,
        });

        Ok(())
    }

    /// Add liquidity to seed the AMM pools.
    pub fn add_liquidity(
        ctx: Context<AddLiquidity>,
        yes_amount: u64,
        no_amount: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(!market.resolved, PrismError::AlreadyResolved);

        market.yes_liquidity = market.yes_liquidity.saturating_add(yes_amount);
        market.no_liquidity = market.no_liquidity.saturating_add(no_amount);

        Ok(())
    }

    /// Buy YES or NO shares. Stores position in a PDA keyed to (buyer, market).
    pub fn buy_shares(
        ctx: Context<BuyShares>,
        outcome: bool, // true = YES
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, PrismError::ZeroAmount);
        let market = &mut ctx.accounts.market;
        require!(!market.resolved, PrismError::AlreadyResolved);

        let position = &mut ctx.accounts.position;
        position.owner = ctx.accounts.buyer.key();
        position.market = ctx.accounts.market.key();
        position.outcome = outcome;
        position.shares = position.shares.saturating_add(amount);
        position.bump = ctx.bumps.position;

        if outcome {
            market.yes_liquidity = market.yes_liquidity.saturating_add(amount);
        } else {
            market.no_liquidity = market.no_liquidity.saturating_add(amount);
        }

        // Recalculate implied odds from liquidity (constant-product AMM style)
        let total = market.yes_liquidity.saturating_add(market.no_liquidity);
        if total > 0 {
            market.yes_odds = (market.yes_liquidity * 10000) / total;
            market.no_odds = 10000u64.saturating_sub(market.yes_odds);
        }

        emit!(SharesPurchased {
            market_id: market.market_id.clone(),
            buyer: ctx.accounts.buyer.key(),
            outcome,
            amount,
        });

        Ok(())
    }

    /// Resolve the market. Called by the Switchboard oracle or the creator.
    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        outcome: bool,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(!market.resolved, PrismError::AlreadyResolved);

        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp >= market.resolution_timestamp,
            PrismError::ResolutionNotReady
        );

        market.resolved = true;
        market.outcome = if outcome { 1 } else { 2 };

        emit!(MarketResolved {
            market_id: market.market_id.clone(),
            outcome,
        });

        Ok(())
    }
}

// ── Accounts ─────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(market_id: String)]
pub struct InitializeMarket<'info> {
    #[account(
        init,
        payer = creator,
        space = Market::LEN,
        seeds = [b"market", market_id.as_bytes()],
        bump,
    )]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SeedSimulation<'info> {
    #[account(mut, has_one = creator)]
    pub market: Account<'info, Market>,
    pub creator: Signer<'info>,
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    pub provider: Signer<'info>,
}

#[derive(Accounts)]
pub struct BuyShares<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(
        init_if_needed,
        payer = buyer,
        space = Position::LEN,
        seeds = [b"position", buyer.key().as_ref(), market.key().as_ref()],
        bump,
    )]
    pub position: Account<'info, Position>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut, has_one = creator)]
    pub market: Account<'info, Market>,
    pub creator: Signer<'info>,
}

// ── State ─────────────────────────────────────────────────────────────────────

#[account]
pub struct Market {
    pub creator: Pubkey,           // 32
    pub market_id: String,         // 4 + 64
    pub question: String,          // 4 + 256
    pub resolution_timestamp: i64, // 8
    pub yes_odds: u64,             // 8  (basis points)
    pub no_odds: u64,              // 8
    pub yes_liquidity: u64,        // 8
    pub no_liquidity: u64,         // 8
    pub resolved: bool,            // 1
    pub outcome: u8,               // 1  (0=open, 1=YES, 2=NO)
    pub simulation_hash: [u8; 32], // 32
    pub bump: u8,                  // 1
}

impl Market {
    pub const LEN: usize = 8 + 32 + (4 + 64) + (4 + 256) + 8 + 8 + 8 + 8 + 8 + 1 + 1 + 32 + 1;
}

#[account]
pub struct Position {
    pub owner: Pubkey,   // 32
    pub market: Pubkey,  // 32
    pub outcome: bool,   // 1
    pub shares: u64,     // 8
    pub bump: u8,        // 1
}

impl Position {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 8 + 1;
}

// ── Events ────────────────────────────────────────────────────────────────────

#[event]
pub struct MarketCreated {
    pub market_id: String,
    pub creator: Pubkey,
    pub question: String,
    pub yes_odds: u64,
}

#[event]
pub struct SimulationSeeded {
    pub market_id: String,
    pub simulation_hash: [u8; 32],
    pub yes_probability: u64,
}

#[event]
pub struct SharesPurchased {
    pub market_id: String,
    pub buyer: Pubkey,
    pub outcome: bool,
    pub amount: u64,
}

#[event]
pub struct MarketResolved {
    pub market_id: String,
    pub outcome: bool,
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[error_code]
pub enum PrismError {
    #[msg("Market has already been resolved")]
    AlreadyResolved,
    #[msg("Resolution timestamp has not been reached")]
    ResolutionNotReady,
    #[msg("Odds must be in basis points (0–10000)")]
    InvalidOdds,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("String field exceeds maximum length")]
    FieldTooLong,
}
