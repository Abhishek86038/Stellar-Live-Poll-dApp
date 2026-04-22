#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol, Vec, String};

mod token {
    soroban_sdk::contractimport!(file = "../../target/wasm32-unknown-unknown/release/xpoll_token.wasm");
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PollData {
    pub id: u32,
    pub question: String,
    pub options: Vec<String>,
    pub votes: Vec<u32>,
    pub creator: Address,
    pub created_at: u64,
    pub status: Symbol, // "active" or "closed"
    pub cost: i128,
    pub total_reward_pool: i128,
}

#[contracttype]
pub enum DataKey {
    PollCount,
    Poll(u32),
    TokenAddr,
}

#[contract]
pub struct AdvancedPoll;

#[contractimpl]
impl AdvancedPoll {
    pub fn init(env: Env, token_addr: Address) {
        env.storage().instance().set(&DataKey::TokenAddr, &token_addr);
        env.storage().instance().set(&DataKey::PollCount, &0u32);
    }

    pub fn create_poll(env: Env, creator: Address, question: String, options: Vec<String>, cost: i128) -> u32 {
        creator.require_auth();
        
        let token_addr: Address = env.storage().instance().get(&DataKey::TokenAddr).unwrap();
        let token_client = token::Client::new(&env, &token_addr);
        
        // INTER-CONTRACT CALL: Burn tokens as cost
        token_client.burn(&creator, &cost);

        let mut count: u32 = env.storage().instance().get(&DataKey::PollCount).unwrap_or(0);
        count += 1;
        
        let mut votes = Vec::new(&env);
        for _ in 0..options.len() {
            votes.push_back(0);
        }

        let poll = PollData {
            id: count,
            question,
            options,
            votes,
            creator: creator.clone(),
            created_at: env.ledger().timestamp(),
            status: Symbol::new(&env, "active"),
            cost,
            total_reward_pool: cost / 2, // Half goes back to the pool as reward
        };

        env.storage().persistent().set(&DataKey::Poll(count), &poll);
        env.storage().instance().set(&DataKey::PollCount, &count);

        env.events().publish(
            (Symbol::new(&env, "PollCreated"), count, creator, cost),
            env.ledger().timestamp(),
        );

        count
    }

    pub fn vote(env: Env, voter: Address, poll_id: u32, option_index: u32, amount: i128) -> bool {
        voter.require_auth();
        
        let mut poll: PollData = env.storage().persistent().get(&DataKey::Poll(poll_id)).unwrap();
        if poll.status != Symbol::new(&env, "active") {
            panic!("Poll is not active");
        }

        let token_addr: Address = env.storage().instance().get(&DataKey::TokenAddr).unwrap();
        let token_client = token::Client::new(&env, &token_addr);
        
        // INTER-CONTRACT CALL: Transfer tokens to contract as stake/vote weight
        token_client.transfer(&voter, &env.current_contract_address(), &amount);

        let mut votes = poll.votes;
        let current_votes = votes.get(option_index).unwrap();
        votes.set(option_index, current_votes + 1);
        poll.votes = votes;
        poll.total_reward_pool += amount;

        env.storage().persistent().set(&DataKey::Poll(poll_id), &poll);

        env.events().publish(
            (Symbol::new(&env, "VoteCast"), poll_id, voter, option_index, amount),
            env.ledger().timestamp(),
        );

        true
    }

    pub fn close_poll(env: Env, creator: Address, poll_id: u32) -> bool {
        creator.require_auth();
        let mut poll: PollData = env.storage().persistent().get(&DataKey::Poll(poll_id)).unwrap();
        if poll.creator != creator {
            panic!("Only creator can close");
        }
        
        poll.status = Symbol::new(&env, "closed");
        env.storage().persistent().set(&DataKey::Poll(poll_id), &poll);

        env.events().publish(
            (Symbol::new(&env, "PollClosed"), poll_id),
            env.ledger().timestamp(),
        );
        true
    }

    pub fn get_poll_info(env: Env, poll_id: u32) -> PollData {
        env.storage().persistent().get(&DataKey::Poll(poll_id)).unwrap()
    }
}
