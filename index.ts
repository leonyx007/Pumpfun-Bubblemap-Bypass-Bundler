import { VersionedTransaction, Keypair, Connection, ComputeBudgetProgram, TransactionInstruction, TransactionMessage } from "@solana/web3.js"
import base58 from "bs58"

import { PRIVATE_KEY,  RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT, SWAP_AMOUNT } from "./constants"
import { readWalletJson, saveDataToFile, sleep } from "./utils"
import { createTokenTx, distributeSol, addAddressesToTable, createLUT, makeBuyIx } from "./src/main";
import { executeJitoTx } from "./executor/jito";
import { transfer } from "./utils/transfer";
import {logger} from "./utils/logger";
const commitment = "confirmed"

const connection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT, commitment
})
const mainKp = Keypair.fromSecretKey(base58.decode(PRIVATE_KEY))
logger.info(mainKp.publicKey.toBase58())
let kps: Keypair[] = []
const transactions: VersionedTransaction[] = []

let mintKp = Keypair.generate()
const mintAddress = mintKp.publicKey

const main = async () => {

  let walletData = readWalletJson("wallets.json")
  let otherWalletData = readWalletJson("otherWallets.json")
  const walletLength = walletData.length;
  const mainBal = await connection.getBalance(mainKp.publicKey)
  logger.info((mainBal / 10 ** 9).toFixed(3), "SOL in main keypair")

  logger.info("Mint address of token ", mintAddress.toBase58())
  saveDataToFile([base58.encode(mintKp.secretKey)], "mint.json")

  const tokenCreationIxs = await createTokenTx(mainKp, mintKp)
  const minimumSolAmount = (SWAP_AMOUNT + 0.01) * walletLength + 0.05
  logger.info("🚀 ~ main ~ minimumSolAmount:", minimumSolAmount)

  if (mainBal / 10 ** 9 < minimumSolAmount) {
    logger.info("Main wallet balance is not enough to run the bundler")
    logger.info(`Plz charge the wallet more than ${minimumSolAmount}SOL`)
    return
  }

  logger.info("Distributing SOL to wallets...")

  let result = await distributeSol(connection, mainKp, walletData.length)
  if (!result) {
    logger.info("Distribution failed")
    return
  } else {
    kps = result
  }
  logger.info("Creating LUT started")
  const lutAddress = await createLUT(mainKp)
  if (!lutAddress) {
    logger.info("Lut creation failed")
    return
  }
  logger.info("LUT Address:", lutAddress.toBase58())
  saveDataToFile([lutAddress.toBase58()], "lut.json")
  await addAddressesToTable(lutAddress, mintAddress, kps, mainKp)
  const buyIxs: TransactionInstruction[] = []

  for (let i = 0; i < walletData.length; i++) {
    const ix = await makeBuyIx(kps[i], Math.floor(SWAP_AMOUNT * 10 ** 9), i, mainKp.publicKey, mintAddress)
    buyIxs.push(...ix)
  }

  const lookupTable = (await connection.getAddressLookupTable(lutAddress)).value;
  if (!lookupTable) {
    logger.info("Lookup table not ready")
    return
  }
  const latestBlockhash = await connection.getLatestBlockhash()

  const tokenCreationTx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: mainKp.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: tokenCreationIxs
    }).compileToV0Message()
  )

  tokenCreationTx.sign([mainKp, mintKp])

  transactions.push(tokenCreationTx)
  for (let i = 0; i < Math.ceil(2 / 5); i++) {
    const latestBlockhash = await connection.getLatestBlockhash()
    const instructions: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 5_000_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 20_000 }),
    ]

    for (let j = 0; j < 5; j++) {
      const index = i * 5 + j
      if (kps[index])
        instructions.push(buyIxs[index * 2], buyIxs[index * 2 + 1])
    }
    const msg = new TransactionMessage({
      payerKey: kps[i * 5].publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions
    }).compileToV0Message([lookupTable])

    const tx = new VersionedTransaction(msg)
    for (let j = 0; j < 5; j++) {
      const index = i * 5 + j
      if (kps[index])
        tx.sign([kps[index]])
    }
    transactions.push(tx)
  }

  transactions.map(async (tx, i) => logger.info(i.toString(), " | ", tx.serialize().length, "bytes | \n", (await connection.simulateTransaction(tx, { sigVerify: true }))))
  const jitoSignature = await executeJitoTx(transactions, mainKp, commitment)
  logger.info("jito bundle Signature:", jitoSignature)
  await sleep(10000)
  if ( jitoSignature ) {
    await transfer()
  }
}

main()

