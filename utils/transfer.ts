import base58 from "bs58"
import { readJson, readWalletJson, retrieveEnvVariable, saveDataToFile, sleep } from "./utils"
import { ComputeBudgetProgram, Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createCloseAccountInstruction, createTransferCheckedInstruction, createTransferInstruction, getAccount, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { SPL_ACCOUNT_LAYOUT, TokenAccount } from "@raydium-io/raydium-sdk";
import { RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT } from "../constants";

export const solanaConnection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT, commitment: "confirmed"
})

const rpcUrl = retrieveEnvVariable("RPC_ENDPOINT");
const connection = new Connection(rpcUrl, { commitment: "confirmed" });

export const transfer = async () => {
  console.log("=====start transfer to other wallets===== ")
  const walletsData = readJson() 
  let otherWalletData = readWalletJson("otherWallets.json")
  let wallets = walletsData.map((kp) => Keypair.fromSecretKey(base58.decode(kp)))
  let otherWallets = otherWalletData.map((kp) => Keypair.fromSecretKey(base58.decode(kp)))

  wallets.map(async (kp, index) => {
    try {
      
      await sleep(index * 50)
      const accountInfo = await connection.getAccountInfo(kp.publicKey)

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
        const baseAta = await getAssociatedTokenAddress(accounts[j].accountInfo.mint, kp.publicKey)
        const toAta = await getAssociatedTokenAddress(accounts[j].accountInfo.mint, otherWallets[index].publicKey); 
        const tokenBalance = (await connection.getTokenAccountBalance(accounts[j].pubkey)).value
        console.log("Wallet address & balance : ", kp.publicKey.toBase58(), tokenBalance.amount)
        ixs.push(createAssociatedTokenAccountIdempotentInstruction(kp.publicKey, toAta, otherWallets[index].publicKey, accounts[j].accountInfo.mint))
        if (tokenBalance.uiAmount && tokenBalance.uiAmount > 0)
          ixs.push(createTransferCheckedInstruction(baseAta, accounts[j].accountInfo.mint, toAta, kp.publicKey, BigInt(tokenBalance.amount), tokenBalance.decimals))
        ixs.push(createCloseAccountInstruction(baseAta, otherWallets[index].publicKey, kp.publicKey))
      }

      if (accountInfo) {
        const solBal = await connection.getBalance(kp.publicKey)
        const fee = 5000 + 22000 + 2_039_280
        const transferAmount = solBal - fee;
        ixs.push(
          SystemProgram.transfer({
            fromPubkey: kp.publicKey,
            toPubkey: otherWallets[index].publicKey,
            lamports: transferAmount
          })
        )
      }

      if (ixs.length) {
        const tx = new Transaction().add(
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 220_000 }),
          ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }),
          ...ixs,
        )
        tx.feePayer = kp.publicKey
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
        console.log("transfer simulation ==> ", await connection.simulateTransaction(tx))
        const sig = await sendAndConfirmTransaction(connection, tx, [kp], { commitment: "confirmed" })
        console.log(`Closed and transfer SOL from B wallets ${index} : https://solscan.io/tx/${sig}`)
        try {
          saveDataToFile(otherWalletData.map(kp => kp.toString()))
        } catch (error) {
          console.log("save wallet error => ", error)
        }
        return
      }
    } catch (error) {
      console.log("transaction error while gathering", error)
      return
    }
  })
}

