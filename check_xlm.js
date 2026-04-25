const fetch = require('node-fetch');
async function check() {
  const res = await fetch('https://horizon-testnet.stellar.org/accounts/GD5WUAXGPDZ7YALI6JZAVJDTSPL4O4OJMYACR7YJSZQYVSDPMY5Z7NQS');
  const data = await res.json();
  const native = data.balances.find(b => b.asset_type === 'native');
  console.log('XLM Balance:', native.balance);
}
check();
