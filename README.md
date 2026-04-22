# 🌊 Enhanced Live Poll - Level 4 Green Belt Implementation

## 📌 Quick Navigation
* [🏆 Level 2: Yellow Belt Submission](#-yellow-belt-submission-links)
* [🏆 Level 3: Green Belt Submission](#-green-belt-level-3-submission-details-official)
* [🏆 Level 4: Advanced Green Belt (DEX & Tokens)](#-level-4-advanced-green-belt-implementation-official)
* [🛠️ Installation & Setup](#-prerequisites--installation)

---

## 🏆 LEVEL 4: ADVANCED GREEN BELT IMPLEMENTATION (OFFICIAL) 🏆

![CI/CD Status](https://img.shields.io/badge/CI%2FCD-Success-brightgreen)
![Stellar Network](https://img.shields.io/badge/Network-Testnet-blue)
![Soroban SDK](https://img.shields.io/badge/Soroban-v22.0.0-orange)

### 🚀 Level 4 - Advanced Features
- **Token-Gated Polling**: Custom `XPOLL` token created to manage poll creation and voting rewards.
- **Inter-Contract Calls**: The Poll contract now communicates directly with the Token contract to verify/mint rewards.
- **On-Chain DEX (Liquidity Pool)**: Basic AMM implementation for `XLM/XPOLL` swaps directly in the dApp.
- **Real-Time Event Streaming**: WebSocket-based activity feed for live on-chain events.
- **CI/CD Pipeline**: Fully automated GitHub Actions workflow for contract builds and frontend testing.
- **100% Mobile Responsive**: Fluid "Water Aesthetic" design optimized for all screen sizes.

### 🏗️ Architecture Visualization
```mermaid
graph TD
    User[User Wallet] --> Dashboard[Frontend Dashboard]
    Dashboard --> PollContract[Poll Smart Contract]
    Dashboard --> PoolContract[Liquidity Pool Contract]
    PollContract -- Inter-contract Call --> TokenContract[XPOLL Token Contract]
    PoolContract -- DEX Swap --> TokenContract
```

### ✅ Level 4 Requirements Tracking
- [x] **Inter-contract calls** (Poll -> Token)
- [x] **Custom token creation** (XPOLL)
- [x] **Basic liquidity pool mechanics**
- [x] **Advanced event streaming**
- [x] **CI/CD pipeline** (GitHub Actions)
- [x] **Mobile responsive design** (100% responsive)

---

## 🏆 GREEN BELT (LEVEL 3) SUBMISSION DETAILS (OFFICIAL) 🏆

✅ **Contract ID (Restricted Voting):** `CCPC6IAMNB3M5ULNYKIUYQAY7LD55J27MAK4F3D66WNHE7V5UA7DJMP3`  
✅ **Transaction Hash (First Voter):** `1ca6e1a86718253769ea82b58d7a8277a2b6cdcca185618424b3150811242c9c`  
✅ **Test Status:** 10 Tests Passing

### 🚀 Level 3 - Advanced Feature Implementation
- **Block-Level Anti-Double-Vote**: Address-mapping storage used in smart contract to prevent double voting.
- **Performance Optimized Caching**: `useCache.js` saves poll results in memory.
- **State-of-the-art UI Loaders**: Custom `SkeletonLoader` and `LoadingSpinner`.

---

## 🏆 YELLOW BELT (LEVEL 2) SUBMISSION LINKS 🏆

✅ **Deployed contract address:** `CACPWBSL75BAJQVP5ULZYSIHQ572DHXJNJ2AF3O3U3LTJQ6GG6FNTAA2`  
✅ **Transaction hash of a contract call:** `e81c8c0ad2b9e5e76f5ad25b6b8420c01705f260016c09202bf3c7a3f5a99194`

---

## 🔨 Prerequisites & Installation

### Prerequisites
- Node.js v18+
- Freighter wallet
- Rust & Soroban CLI

### Installation
```bash
npm install
```

### Smart Contract Workspace Build
```bash
cd smart-contract
cargo build --target wasm32-unknown-unknown --release
```

---

## 🧑‍💻 Author Info
**Created By**: Abhishek (Stellar Developer)
- **Objective Tracker**: Stellar Journey to Mastery - Green Belt Candidate
- **Github**: [Abhishek86038/Stellar-Live-Poll-dApp](https://github.com/Abhishek86038/Stellar-Live-Poll-dApp)
