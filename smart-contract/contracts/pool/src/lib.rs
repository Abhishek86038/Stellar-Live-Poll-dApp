#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol, log, token};

#[contracttype]
pub enum DataKey {
    TokenXPoll,
    TokenNative, // XLM
    ReserveXPoll,
    ReserveNative,
}

#[contract]
pub struct LiquidityPool;

#[contractimpl]
impl LiquidityPool {
    pub fn init(env: Env, xpoll: Address, native: Address) {
        env.storage().instance().set(&DataKey::TokenXPoll, &xpoll);
        env.storage().instance().set(&DataKey::TokenNative, &native);
        env.storage().instance().set(&DataKey::ReserveXPoll, &0i128);
        env.storage().instance().set(&DataKey::ReserveNative, &0i128);
    }

    pub fn add_liquidity(env: Env, provider: Address, xpoll_amount: i128, native_amount: i128) -> i128 {
        provider.require_auth();
        
        let xpoll_addr: Address = env.storage().instance().get(&DataKey::TokenXPoll).unwrap();
        let native_addr: Address = env.storage().instance().get(&DataKey::TokenNative).unwrap();

        let xpoll_client = token::Client::new(&env, &xpoll_addr);
        let native_client = token::Client::new(&env, &native_addr);

        xpoll_client.transfer(&provider, &env.current_contract_address(), &xpoll_amount);
        native_client.transfer(&provider, &env.current_contract_address(), &native_amount);

        let reserve_xpoll: i128 = env.storage().instance().get(&DataKey::ReserveXPoll).unwrap_or(0);
        let reserve_native: i128 = env.storage().instance().get(&DataKey::ReserveNative).unwrap_or(0);

        env.storage().instance().set(&DataKey::ReserveXPoll, &(reserve_xpoll + xpoll_amount));
        env.storage().instance().set(&DataKey::ReserveNative, &(reserve_native + native_amount));

        let lp_tokens = xpoll_amount; // Simplification: 1:1 for now or sqrt(x*y)

        env.events().publish(
            (Symbol::new(&env, "LiquidityAdded"), provider, xpoll_amount, native_amount, lp_tokens),
            env.ledger().timestamp(),
        );

        lp_tokens
    }

    pub fn swap_xpoll_to_native(env: Env, trader: Address, xpoll_in: i128) -> i128 {
        trader.require_auth();
        
        let reserve_xpoll: i128 = env.storage().instance().get(&DataKey::ReserveXPoll).unwrap();
        let reserve_native: i128 = env.storage().instance().get(&DataKey::ReserveNative).unwrap();

        // Formula: out_amount = (in_amount * 997 * reserve_out) / (reserve_in * 1000 + in_amount * 997)
        let out_amount = (xpoll_in * 997 * reserve_native) / (reserve_xpoll * 1000 + xpoll_in * 997);

        let xpoll_addr: Address = env.storage().instance().get(&DataKey::TokenXPoll).unwrap();
        let native_addr: Address = env.storage().instance().get(&DataKey::TokenNative).unwrap();

        token::Client::new(&env, &xpoll_addr).transfer(&trader, &env.current_contract_address(), &xpoll_in);
        token::Client::new(&env, &native_addr).transfer(&env.current_contract_address(), &trader, &out_amount);

        env.storage().instance().set(&DataKey::ReserveXPoll, &(reserve_xpoll + xpoll_in));
        env.storage().instance().set(&DataKey::ReserveNative, &(reserve_native - out_amount));

        env.events().publish(
            (Symbol::new(&env, "SwapExecuted"), trader, xpoll_in, out_amount, true),
            env.ledger().timestamp(),
        );

        out_amount
    }

    pub fn swap_native_to_xpoll(env: Env, trader: Address, native_in: i128) -> i128 {
        trader.require_auth();
        
        let reserve_xpoll: i128 = env.storage().instance().get(&DataKey::ReserveXPoll).unwrap();
        let reserve_native: i128 = env.storage().instance().get(&DataKey::ReserveNative).unwrap();

        let out_amount = (native_in * 997 * reserve_xpoll) / (reserve_native * 1000 + native_in * 997);

        let xpoll_addr: Address = env.storage().instance().get(&DataKey::TokenXPoll).unwrap();
        let native_addr: Address = env.storage().instance().get(&DataKey::TokenNative).unwrap();

        token::Client::new(&env, &native_addr).transfer(&trader, &env.current_contract_address(), &native_in);
        token::Client::new(&env, &xpoll_addr).transfer(&env.current_contract_address(), &trader, &out_amount);

        env.storage().instance().set(&DataKey::ReserveNative, &(reserve_native + native_in));
        env.storage().instance().set(&DataKey::ReserveXPoll, &(reserve_xpoll - out_amount));

        env.events().publish(
            (Symbol::new(&env, "SwapExecuted"), trader, native_in, out_amount, false),
            env.ledger().timestamp(),
        );

        out_amount
    }

    pub fn get_reserves(env: Env) -> (i128, i128) {
        let rx: i128 = env.storage().instance().get(&DataKey::ReserveXPoll).unwrap_or(0);
        let rn: i128 = env.storage().instance().get(&DataKey::ReserveNative).unwrap_or(0);
        (rx, rn)
    }
}
