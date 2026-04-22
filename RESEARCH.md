# Research: Split Bill Calculator on Stellar Testnet

## 1. Project Overview
The "Split Bill Calculator" is a decentralized application (dApp) built on the Stellar Testnet. It allows users to connect their Freighter wallet, calculate how to split a bill among multiple people, and send XLM payments directly to recipients.

## 2. Key Technologies

### Stellar Network (Testnet)
- **Horizon API**: The interface for interacting with the Stellar network.
- **Stellar SDK**: JavaScript library for building and signing transactions.
- **Network Passphrase**: `Test SDF Network ; September 2015`

### Wallet: Freighter Extension
- **API**: `@stellar/freighter-api`
- **Capabilities**: Public key retrieval, transaction signing, network detection.

## 3. Core Functionalities

### A. Wallet Connection
- **Connect**: Use `requestAccess()` to prompt the user.
- **Disconnect**: Clearing session state (Freighter remains connected, but the app "logs out").
- **Persistence**: Checking `isConnected()` on page load.

### B. Balance Handling
- **Endpoint**: `https://horizon-testnet.stellar.org/accounts/{publicKey}`
- **Logic**: Parse the `balances` array and find the entry where `asset_type === 'native'`.

### C. Split Bill Logic
- **Inputs**: Total Bill Amount (XLM), Number of Participants (excluding sender).
- **Calculation**: 
  - `Total Participants = Participants + 1`
  - `Amount per Person = Total Bill / Total Participants`
- **Recipients**: Users can enter a recipient address to send the calculated share.

### D. Transaction Flow
1. **Build**: Create a `Payment` operation using `StellarSdk.TransactionBuilder`.
2. **Fetch Sequence**: Use `server.loadAccount` to get the current sequence number.
3. **Sign**: Use `signTransaction(xdr)` from Freighter API.
4. **Submit**: Use `server.submitTransaction(signedTransaction)`.

## 4. UI/UX Requirements
- **Responsive Design**: Mobile-first approach.
- **Micro-interactions**: Hover effects on buttons, loading spinners for transactions.
- **Feedback**: 
  - Toast notifications for success/failure.
  - Link to StellarExpert or Stellar.org Laboratory for transaction verification.

## 5. Development Standards
- **Error Handling**: Catch and display specific Stellar errors (e.g., `op_low_reserve`, `tx_bad_seq`).
- **Clean Architecture**: Separate Stellar logic (Service layer) from UI components.
- **Security**: Never store private keys; always use Freighter for signing.


