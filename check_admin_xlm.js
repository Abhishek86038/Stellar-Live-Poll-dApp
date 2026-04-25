const fetch = require('node-fetch');
async function check() {
  const res = await fetch('https://horizon-testnet.stellar.org/accounts/GBXBZYRUXADVOOB5TIBNDHMCH7TAUEEUDJDV5WLOBWIZMUVFBXHXQ76N');
  const data = await res.json();
  const native = data.balances.find(b => b.asset_type === 'native');
  console.log('Admin XLM Balance:', native.balance);
}
check();
