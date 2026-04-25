# 🌊 Advanced Stellar Live Poll - Level 4 Green Belt (Final Submission)

A professional, production-ready Stellar dApp featuring three inter-linked Soroban smart contracts, a custom XPOLL token economy, and a premium glassmorphism dashboard.

## 🏆 LEVEL 4: GREEN BELT SPECIFICATIONS (FINAL)

This project is fully integrated with the Stellar Testnet. All dummy logic and accounts have been removed, and the frontend communicates directly with live Soroban contracts.

### ✅ Verified Requirements
- [x] **Multi-Contract Integration**: Linked Token, Liquidity Pool, and Advanced Poll contracts.
- [x] **Real-time Account Integration**: Simulations and transactions use the active user's wallet address.
- [x] **Clean Repository**: Only 3 distinct smart contract `lib.rs` files are used.
- [x] **DEX Mechanics**: Automated XLM/XPOLL swap with live reserve fetching.
- [x] **Full Functionality**: Every contract function (Vote, Create, Close, Swap) is integrated into the UI.

### 🔗 Official Contract Identifiers (Live Testnet)
- **Advanced Poll Contract**: `CC6VHB7JGO6XWNWSDWPKNKNA6N63K5Z567RPGZQPBAHNZCWAVMNMSI7S`
- **XPOLL Token Contract**: `CA4NSRXEWFPDCMEBDQVUV3GHXAR5RNZV42SL2R2M42RVEADKKAQUONZJ`
- **Liquidity Pool Contract**: `CBUKW4W6FNO6J6E2672OZ6EXERWH3H7CBYUZXMMTNK7PFXK3WQRAVKNV`

### 🛡️ On-Chain Verification Hashes
These hashes correspond to recent live activity on the Testnet for the user account:
- **Latest Transaction**: `eb04d124fc4ea435b5d2190c68c6be890f05a9b8f594a4f986ee2ef0c7b2d52e`
- **Contract Interaction**: `d4143312ac4fa361aec3de0fc00254102f8a183f86630673f19cfc65342f4b6c`
- **System Activity**: `56658f42e7836b4fcc189e5bd0ad73456dc0edad1bb846f1e8ec850f003e925e`

---

## 🎯 Key Features

### 1. Advanced Token-Gated Voting
Users interact with the `Advanced Poll` contract. Voting requires staking `XPOLL` tokens, which are handled via inter-contract calls to the `XPOLL Token` contract.

### 2. Built-in DEX (Swap)
The `Liquidity Pool` contract allows users to swap XLM for XPOLL tokens. The frontend fetches live reserves to calculate real-time exchange rates (Target: 1 XLM = 4 XPOLL).

### 3. Professional Dashboard
- Real-time balance fetching for both native XLM and custom XPOLL tokens.
- Dynamic "Polls Created" counter using on-chain simulation.
- Verified transaction history fetched directly from the Horizon API.

---

## 🧑‍💻 Author Info
**Developer**: Abhishek (Stellar Developer)
**Project**: Live Poll dApp - Green Belt Candidate
**Github**: [Abhishek86038/Stellar-Live-Poll-dApp](https://github.com/Abhishek86038/Stellar-Live-Poll-dApp)
