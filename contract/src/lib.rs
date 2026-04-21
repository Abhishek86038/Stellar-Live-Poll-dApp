#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Env, String, Symbol, Vec};

#[contract]
pub struct PollContract;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Question,     // Stores the poll question (String)
    Options,      // Stores the list of options (Vec<String>)
    Votes,        // Stores the vote count for each option (Vec<u32>)
    Initialized,  // Stores whether the poll has been initialized (bool)
}

#[contractimpl]
impl PollContract {
    /// Initializes the poll with a question and a list of options.
    /// 
    /// This function sets up the persistent storage and can only be called once.
    /// It ensures that at least one option is provided.
    pub fn init_poll(env: Env, question: String, options: Vec<String>) {
        // Validation: ensures options are not empty
        assert!(options.len() > 0, "Poll must have at least one option");

        // Edge case: ensure poll is not already initialized
        let is_initialized = env.storage().persistent().has(&DataKey::Initialized);
        assert!(!is_initialized, "Poll is already initialized");

        // Initialize the vote counts to 0 for each option
        let mut initial_votes: Vec<u32> = Vec::new(&env);
        for _ in 0..options.len() {
            initial_votes.push_back(0);
        }

        // Store poll data into persistent storage as requested by requirements
        env.storage().persistent().set(&DataKey::Question, &question);
        env.storage().persistent().set(&DataKey::Options, &options);
        env.storage().persistent().set(&DataKey::Votes, &initial_votes);
        env.storage().persistent().set(&DataKey::Initialized, &true);
    }

    /// Casts a vote for a specific option by its index.
    /// 
    /// It validates that the index is within bounds and increments the vote count.
    /// Emits a "VoteCast" event upon success.
    pub fn vote(env: Env, option_index: u32) {
        // Ensure the poll has been initialized
        let is_initialized = env.storage().persistent().has(&DataKey::Initialized);
        assert!(is_initialized, "Poll is not initialized yet");

        // Retrieve the current votes array from persistent storage
        let mut votes: Vec<u32> = env.storage().persistent().get(&DataKey::Votes).unwrap();

        // Edge case: validate the selected option index to prevent out-of-bounds error
        assert!(option_index < votes.len(), "Invalid option index");

        // Increment the vote count for the chosen option
        let current_vote_count = votes.get(option_index).unwrap();
        votes.set(option_index, current_vote_count + 1);

        // Update persistent storage with new vote counts
        env.storage().persistent().set(&DataKey::Votes, &votes);

        // Emit an event to notify indexers/listeners that a vote has been cast.
        // It publishes topics ("VoteCast", ) with the data `option_index`.
        let topics = (symbol_short!("VoteCast"),);
        env.events().publish(topics, option_index);
    }

    /// Returns the current vote counts for all options in the poll.
    /// 
    /// The length of the returned array will match the length of the initially provided options.
    pub fn get_results(env: Env) -> Vec<u32> {
        // Optionally, ensure the poll has been initialized so we don't unwrap uninitialized storage
        let is_initialized = env.storage().persistent().has(&DataKey::Initialized);
        assert!(is_initialized, "Poll is not initialized yet");

        // Return the votes
        env.storage().persistent().get(&DataKey::Votes).unwrap()
    }
}
