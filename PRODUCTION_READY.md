# Stellar Live Poll Level 4 - Green Belt Production Guide

This document outlines the advanced architecture and features of the Level 4 dApp.

## 🏗️ Smart Contract Architecture

The system consists of three inter-linked contracts on the Stellar Testnet/Soroban:

1.  **XPOLL Token Contract**: A custom token implementation with Mint, Burn, Transfer, and Approve functionality.
2.  **Liquidity Pool (DEX)**: An automated market maker (AMM) for swapping XLM/XPOLL using the constant product formula ($x \times y = k$).
3.  **Advanced Poll Contract**: Token-gated poll system that performs inter-contract calls to the Token contract to charge fees and unlock rewards.

## 📱 Frontend Features

*   **100% Responsive Design**: Fluid layout with specialized mobile navigation for touch devices.
*   **Real-time Event Streaming**: WebSocket-based activity feed showing poll creations and votes as they happen.
*   **Token Dashboard**: Complete overview of user assets and voting history.
*   **Token Swap**: Native DEX interface with price estimates and slippage controls.

## 🔄 CI/CD Pipeline

The project includes a GitHub Actions workflow (`.github/workflows/ci-cd.yml`) that:
1.  Automatically runs Rust/Soroban contract builds.
2.  Runs automated tests for the React frontend.
3.  Verifies the build process for production readiness.

## 🚀 Deployment Instructions

### Contract Deployment
```bash
# 1. Deploy Token
soroban contract deploy --wasm target/wasm32-unknown-unknown/release/xpoll_token.wasm --id xpoll-token-id

# 2. Deploy Pool
soroban contract deploy --wasm target/wasm32-unknown-unknown/release/liquidity_pool.wasm --id pool-id

# 3. Deploy Poll (Uses Token ID in init)
soroban contract deploy --wasm target/wasm32-unknown-unknown/release/advanced_poll.wasm --id poll-id
```

### Frontend Deployment
The dApp is configured to be deployed on **Vercel** with automatic branch previews.
```bash
npm run build
vercel deploy --prod
```
