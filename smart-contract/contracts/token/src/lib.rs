#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol, log};

#[contracttype]
pub enum DataKey {
    Admin,
    Balance(Address),
    Allowance(Address, Address), // (Owner, Spender)
}

#[contract]
pub struct XPollToken;

#[contractimpl]
impl XPollToken {
    pub fn init(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let key = DataKey::Balance(to.clone());
        let current_balance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        env.storage().persistent().set(&key, &(current_balance + amount));

        env.events().publish(
            (Symbol::new(&env, "TokenMinted"), to.clone(), amount),
            env.ledger().timestamp(),
        );
        log!(&env, "Minted {} tokens to {}", amount, to);
    }

    pub fn burn(env: Env, from: Address, amount: i128) {
        from.require_auth();
        let key = DataKey::Balance(from.clone());
        let current_balance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if current_balance < amount {
            panic!("Insufficient balance to burn");
        }
        env.storage().persistent().set(&key, &(current_balance - amount));

        env.events().publish(
            (Symbol::new(&env, "TokenBurned"), from, amount),
            env.ledger().timestamp(),
        );
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> bool {
        from.require_auth();
        let from_key = DataKey::Balance(from.clone());
        let to_key = DataKey::Balance(to.clone());

        let from_balance: i128 = env.storage().persistent().get(&from_key).unwrap_or(0);
        if from_balance < amount {
            panic!("Insufficient balance");
        }

        let to_balance: i128 = env.storage().persistent().get(&to_key).unwrap_or(0);
        env.storage().persistent().set(&from_key, &(from_balance - amount));
        env.storage().persistent().set(&to_key, &(to_balance + amount));

        env.events().publish(
            (Symbol::new(&env, "TokenTransferred"), from, to, amount),
            env.ledger().timestamp(),
        );
        true
    }

    pub fn approve(env: Env, owner: Address, spender: Address, amount: i128) {
        owner.require_auth();
        let key = DataKey::Allowance(owner.clone(), spender.clone());
        env.storage().persistent().set(&key, &amount);

        env.events().publish(
            (Symbol::new(&env, "ApprovalGranted"), owner, spender, amount),
            env.ledger().timestamp(),
        );
    }

    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) -> bool {
        spender.require_auth();
        let allowance_key = DataKey::Allowance(from.clone(), spender.clone());
        let current_allowance: i128 = env.storage().persistent().get(&allowance_key).unwrap_or(0);
        
        if current_allowance < amount {
            panic!("Insufficient allowance");
        }

        let from_key = DataKey::Balance(from.clone());
        let from_balance: i128 = env.storage().persistent().get(&from_key).unwrap_or(0);
        if from_balance < amount {
            panic!("Insufficient balance");
        }

        env.storage().persistent().set(&allowance_key, &(current_allowance - amount));
        
        let to_key = DataKey::Balance(to.clone());
        let to_balance: i128 = env.storage().persistent().get(&to_key).unwrap_or(0);
        
        env.storage().persistent().set(&from_key, &(from_balance - amount));
        env.storage().persistent().set(&to_key, &(to_balance + amount));

        env.events().publish(
            (Symbol::new(&env, "TokenTransferred"), from, to, amount),
            env.ledger().timestamp(),
        );
        true
    }

    pub fn balance_of(env: Env, account: Address) -> i128 {
        env.storage().persistent().get(&DataKey::Balance(account)).unwrap_or(0)
    }
}
