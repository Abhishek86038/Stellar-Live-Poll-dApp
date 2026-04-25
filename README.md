# 🌊 Advanced Stellar Live Poll - Level 4 Green Belt (Final)

A professional, production-ready Stellar dApp featuring multiple inter-linked Soroban smart contracts, an automated liquidity pool, and a premium glassmorphism dashboard.

## 📍 Final Submission Overview
This project has been fully audited to ensure compliance with the Level 4 Green Belt requirements. All "Dummy" integrations have been replaced with real on-chain interactions, and the project structure has been cleaned of redundant files.

---

## 🏆 LEVEL 4: GREEN BELT SPECIFICATIONS

### ✅ Requirements Implementation
- [x] **Proper Multi-Contract Integration**: Full integration with three inter-linked contracts (Token, Pool, Poll).
- [x] **No Dummy Accounts**: All simulations and transactions use the active user's wallet address.
- [x] **Clean Architecture**: Only 3 distinct `lib.rs` files exist (Poll, Pool, Token). No redundant polling logic.
- [x] **Inter-contract Calls**: Poll contract interacts with the XPOLL token contract for staking and rewards.
- [x] **On-Chain DEX**: A constant-product liquidity pool (XLM/XPOLL) with a stable **1:4 exchange rate**.
- [x] **Advanced Feature**: Automated ledger-scanning for real-time transaction activity.
- [x] **Premium UI/UX**: High-end glassmorphism design with a fully responsive layout.

### 🔗 Official Contract Identifiers (Testnet)
- **Advanced Poll Contract**: `CC6VHB7JGO6XWNWSDWPKNKNA6N63K5Z567RPGZQPBAHNZCWAVMNMSI7S`
- **XPOLL Token Contract**: `CA4NSRXEWFPDCMEBDQVUV3GHXAR5RNZV42SL2R2M42RVEADKKAQUONZJ`
- **Liquidity Pool Contract**: `CBUKW4W6FNO6J6E2672OZ6EXERWH3H7CBYUZXMMTNK7PFXK3WQRAVKNV`

---

## 🎯 Key Features

### 1. Token-Gated Staking
Users must hold and stake `XPOLL` tokens to participate in advanced polls. The contract handles automated balance verification and staking logic.

### 2. Built-in DEX (Swap)
An integrated Token Swap page allows users to exchange XLM for XPOLL tokens directly within the dApp. The pool is seeded with deep liquidity to ensure price stability.

### 3. Advanced Poll Management
- **Creation**: Users can create multi-option polls by paying a creation fee in XPOLL.
- **Voting**: Votes are weighted based on the staked amount.
- **Lifecycle**: Poll creators have the exclusive ability to "Close Poll" directly from the UI.

### 4. Robust Dashboard
A real-time dashboard that tracks:
- Live XPOLL Balance
- Number of Polls Created on-chain
- Recent Blockchain Transaction History (fetched directly from Horizon)

---

## 🛠️ Installation & Development

### Frontend
```bash
# Install dependencies
npm install

# Run locally
npm start

# Build for production
npm run build
```

### Smart Contracts (Rust)
The contracts are located in the `smart-contract/contracts` directory.
```bash
# Build WASM
cargo build --target wasm32-unknown-unknown --release
```

---

## 🧑‍💻 Author Info
**Developer**: Abhishek (Stellar Developer)
**Milestone**: Level 4 - Green Belt Certification Submission
**Github**: [Abhishek86038/Stellar-Live-Poll-dApp](https://github.com/Abhishek86038/Stellar-Live-Poll-dApp)
