#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol, Vec};

#[contract]
pub struct PollContract;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Creator,      // Address
    CreatedAt,    // u64
    EndTime,      // u64
    IsClosed,     // bool
    Question,     // Stores the poll question (String)
    Options,      // Stores the list of options (Vec<String>)
    Votes,        // Stores the vote count for each option (Vec<u32>)
    Initialized,  // Stores whether the poll has been initialized (bool)
    HasVoted(Address), // Stores if an address has already voted
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PollMetadata {
    pub creator: Address,
    pub created_at: u64,
    pub total_votes: u32,
}

#[contractimpl]
impl PollContract {
    pub fn init_poll(env: Env, creator: Address, created_at: u64, end_time: u64, question: String, options: Vec<String>) {
        creator.require_auth();

        assert!(options.len() > 0, "Poll must have at least one option");

        let is_initialized = env.storage().persistent().has(&DataKey::Initialized);
        assert!(!is_initialized, "Poll is already initialized");

        let mut initial_votes: Vec<u32> = Vec::new(&env);
        for _ in 0..options.len() {
            initial_votes.push_back(0);
        }

        env.storage().persistent().set(&DataKey::Creator, &creator);
        env.storage().persistent().set(&DataKey::CreatedAt, &created_at);
        env.storage().persistent().set(&DataKey::EndTime, &end_time);
        env.storage().persistent().set(&DataKey::IsClosed, &false);
        
        env.storage().persistent().set(&DataKey::Question, &question);
        env.storage().persistent().set(&DataKey::Options, &options);
        env.storage().persistent().set(&DataKey::Votes, &initial_votes);
        env.storage().persistent().set(&DataKey::Initialized, &true);

        env.events().publish((Symbol::new(&env, "PollCreated"),), question);
    }

    pub fn vote(env: Env, voter: Address, option_index: u32) {
        voter.require_auth();

        let is_initialized = env.storage().persistent().has(&DataKey::Initialized);
        assert!(is_initialized, "Poll is not initialized yet");

        let is_closed: bool = env.storage().persistent().get(&DataKey::IsClosed).unwrap();
        assert!(!is_closed, "Poll is closed");

        // Check if voter has already voted
        let has_voted = env.storage().persistent().has(&DataKey::HasVoted(voter.clone()));
        assert!(!has_voted, "You have already voted in this poll");

        let mut votes: Vec<u32> = env.storage().persistent().get(&DataKey::Votes).unwrap();
        assert!(option_index < votes.len(), "Invalid option index");

        let current_vote_count = votes.get(option_index).unwrap();
        votes.set(option_index, current_vote_count + 1);

        env.storage().persistent().set(&DataKey::Votes, &votes);
        
        // Mark voter as having voted
        env.storage().persistent().set(&DataKey::HasVoted(voter.clone()), &true);

        env.events().publish((symbol_short!("VoteCast"),), (option_index, current_vote_count + 1));
    }

    pub fn close_poll(env: Env, caller: Address) {
        let is_initialized = env.storage().persistent().has(&DataKey::Initialized);
        assert!(is_initialized, "Poll is not initialized yet");

        let creator: Address = env.storage().persistent().get(&DataKey::Creator).unwrap();
        assert!(caller == creator, "Only creator can close the poll");
        caller.require_auth();

        env.storage().persistent().set(&DataKey::IsClosed, &true);

        env.events().publish((Symbol::new(&env, "PollClosed"),), ());
    }

    pub fn get_results(env: Env) -> Vec<u32> {
        let is_initialized = env.storage().persistent().has(&DataKey::Initialized);
        assert!(is_initialized, "Poll is not initialized");
        env.storage().persistent().get(&DataKey::Votes).unwrap()
    }

    pub fn get_total_votes(env: Env) -> u32 {
        let is_initialized = env.storage().persistent().has(&DataKey::Initialized);
        assert!(is_initialized, "Poll is not initialized");

        let votes: Vec<u32> = env.storage().persistent().get(&DataKey::Votes).unwrap();
        let mut total = 0;
        for count in votes.into_iter() {
            total += count;
        }
        total
    }

    pub fn get_winner(env: Env) -> (String, u32) {
        let is_initialized = env.storage().persistent().has(&DataKey::Initialized);
        assert!(is_initialized, "Poll is not initialized");

        let votes: Vec<u32> = env.storage().persistent().get(&DataKey::Votes).unwrap();
        let options: Vec<String> = env.storage().persistent().get(&DataKey::Options).unwrap();
        
        let mut max_votes = 0;
        let mut winner_index = 0;
        for i in 0..votes.len() {
            let count = votes.get(i).unwrap();
            if count > max_votes {
                max_votes = count;
                winner_index = i;
            }
        }
        (options.get(winner_index).unwrap(), max_votes)
    }

    pub fn get_poll_status(env: Env) -> String {
        let is_initialized = env.storage().persistent().has(&DataKey::Initialized);
        if !is_initialized {
            return String::from_str(&env, "uninitialized");
        }
        let is_closed: bool = env.storage().persistent().get(&DataKey::IsClosed).unwrap();
        if is_closed {
            String::from_str(&env, "closed")
        } else {
            String::from_str(&env, "active")
        }
    }

    pub fn get_metadata(env: Env) -> PollMetadata {
        let is_initialized = env.storage().persistent().has(&DataKey::Initialized);
        assert!(is_initialized, "Poll is not initialized");

        let creator = env.storage().persistent().get(&DataKey::Creator).unwrap();
        let created_at = env.storage().persistent().get(&DataKey::CreatedAt).unwrap();
        
        let votes: Vec<u32> = env.storage().persistent().get(&DataKey::Votes).unwrap();
        let mut total_votes = 0;
        for count in votes.into_iter() {
            total_votes += count;
        }

        PollMetadata {
            creator,
            created_at,
            total_votes,
        }
    }

    pub fn get_poll_info(env: Env) -> (String, Vec<String>) {
        let is_initialized = env.storage().persistent().has(&DataKey::Initialized);
        assert!(is_initialized, "Poll is not initialized yet");

        let question = env.storage().persistent().get(&DataKey::Question).unwrap();
        let options = env.storage().persistent().get(&DataKey::Options).unwrap();

        (question, options)
    }
}
