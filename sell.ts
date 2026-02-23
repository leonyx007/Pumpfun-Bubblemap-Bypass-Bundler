import base58 from "bs58"
import { readJson, retrieveEnvVariable, sleep } from "./utils"
import { Connection, Keypair, TransactionInstruction } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { SPL_ACCOUNT_LAYOUT, TokenAccount } from "@raydium-io/raydium-sdk";
import { getSellTxWithJupiter } from "./utils/swapOnlyAmm";
import { execute } from "./executor/legacy";
import { RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT, SELL_PERCENT } from "./constants";

export const solanaConnection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT, commitment: "processed"
})

const rpcUrl = retrieveEnvVariable("RPC_ENDPOINT");
const mainKpStr = retrieveEnvVariable('PRIVATE_KEY');
const connection = new Connection(rpcUrl, { commitment: "processed" });
const mainKp = Keypair.fromSecretKey(base58.decode(mainKpStr))

const main = async () => {
  const walletsData = readJson()
  let wallets = walletsData.map((kp) => Keypair.fromSecretKey(base58.decode(kp)))
  // wallets.push(Keypair.fromSecretKey(base58.decode(BUYER_WALLET)))

  wallets.map(async (kp, i) => {
    try {
      await sleep(i * 50)
      
      const tokenAccounts = await connection.getTokenAccountsByOwner(kp.publicKey, {
        programId: TOKEN_PROGRAM_ID,
      },
        "confirmed"
      )
      const ixs: TransactionInstruction[] = []
      const accounts: TokenAccount[] = [];

      if (tokenAccounts.value.length > 0)
        for (const { pubkey, account } of tokenAccounts.value) {
          accounts.push({
            pubkey,
            programId: account.owner,
            accountInfo: SPL_ACCOUNT_LAYOUT.decode(account.data),
          });
        }

      for (let j = 0; j < accounts.length; j++) {
        const tokenBalance = (await connection.getTokenAccountBalance(accounts[j].pubkey)).value

        let i = 0
        while (true) {
          if (i > 10) {
            console.log("Sell error before gather")
            break
          }
          if (tokenBalance.uiAmount == 0) {
            break
          }
          try {
            let sellAmount = Math.floor(Number(tokenBalance.amount) * SELL_PERCENT / 100).toString()
            const sellTx = await getSellTxWithJupiter(kp, accounts[j].accountInfo.mint, sellAmount)
            if (sellTx == null) {
              // console.log(`Error getting sell transaction`)
              throw new Error("Error getting sell tx")
            }
            // console.log(await solanaConnection.simulateTransaction(sellTx))
            const latestBlockhashForSell = await solanaConnection.getLatestBlockhash()
            const txSellSig = await execute(sellTx, latestBlockhashForSell, false)
            const tokenSellTx = txSellSig ? `https://solscan.io/tx/${txSellSig}` : ''
            console.log("Sold token, ", tokenSellTx)
            break
          } catch (error) {
            i++
          }
        }
      }
    } catch (error) {
      console.log("transaction error while selling", error)
      return
    }
  })
}

main()
