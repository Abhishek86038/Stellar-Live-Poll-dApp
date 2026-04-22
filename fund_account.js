const { Keypair } = require("@stellar/stellar-sdk");
const axios = require("axios");

async function fund() {
  const secret = "SARA576LORQY7YBI5QX3NUIJDWTQA2EIXVJO2CWIUG24ALEF4TBHGU3K";
  const kp = Keypair.fromSecret(secret);
  const pub = kp.publicKey();
  console.log(`Public Key: ${pub}`);
  
  console.log(`Funding ${pub} via Friendbot...`);
  try {
    const res = await axios.get(`https://friendbot.stellar.org/?addr=${pub}`);
    console.log("Friendbot response:", res.data);
  } catch (e) {
    console.error("Friendbot failed (maybe already funded?):", e.message);
  }
}

fund();
