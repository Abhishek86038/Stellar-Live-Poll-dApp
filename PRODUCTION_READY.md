# Stellar Live Poll - Production Status

## 🚀 Live Environment Status
- **Network**: Stellar Testnet
- **Token Contract (XPOLL)**: `CA4NSRXEWFPDCMEBDQVUV3GHXAR5RNZV42SL2R2M42RVEADKKAQUONZJ`
- **Liquidity Pool**: `CBUKW4W6FNO6J6E2672OZ6EXERWH3H7CBYUZXMMTNK7PFXK3WQRAVKNV` (Active: 100 XPOLL / 100 XLM)
- **Poll System**: `CC6VHB7JGO6XWNWSDWPKNKNA6N63K5Z567RPGZQPBAHNZCWAVMNMSI7S`

## ✅ Fixed Issues
1. **Weighted Voting**: Votes are now `i128` to support tokens weights correctly.
2. **Transaction Stability**: Robust manual assembly fallback implemented for Freighter.
3. **Balance Display**: Using `balance_of` as the primary standard.
4. **Liquidity**: Initial 100:100 pool initialized for swapping.

## ⚠️ Important Operating Instructions
- **Working Directory**: ALWAYS run `npm start` from the **ROOT** directory (`stellar-connect-wallet`). Running from `smart-contract` will fail to load environment variables.
- **Wallet Connection**: Ensure you are connected to **Testnet** in Freighter.
- **Minting**: Admin can mint tokens using the provided scripts or CLI if more are needed.

## 🛠️ Verification Commands
```bash
# Check Pool Reserves
stellar contract invoke --id CBUKW4W6FNO6J6E2672OZ6EXERWH3H7CBYUZXMMTNK7PFXK3WQRAVKNV --network testnet --source abhishek -- get_reserves

# Check Balance
stellar contract invoke --id CA4NSRXEWFPDCMEBDQVUV3GHXAR5RNZV42SL2R2M42RVEADKKAQUONZJ --network testnet --source abhishek -- balance_of --account <ADDRESS>
```
