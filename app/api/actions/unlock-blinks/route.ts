import {
  ActionPostResponse,
  createPostResponse,
  ActionGetResponse,
  ActionPostRequest,
  createActionHeaders,
} from "@solana/actions";
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { createHmac } from "crypto";
import { BLINKS_SOL_ADDRESS, BLINKS_SOL_AMOUNT } from "./const";

interface ExtendedActionPostResponse extends ActionPostResponse {
  token: string;
}


const headers = createActionHeaders();

export const GET = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    const { toPubkey } = validatedQueryParams(requestUrl);

    const baseHref = new URL(
      `/api/actions/unlock-blinks?to=${toPubkey.toBase58()}`,
      requestUrl.origin
    ).toString();

    const payload: ActionGetResponse = {
      title: "Unlock BlinksGPT",
      icon: new URL("/solana.webp", requestUrl.origin).toString(),
      description: "Pay 0.1 SOL to access BlinksGPT.",
      label: "Transfer",
      links: {
        actions: [
          {
            label: "Pay 0.1 SOL",
            href: `${baseHref}&amount=${BLINKS_SOL_AMOUNT}`,
          },
        ],
      },
    };

    return Response.json(payload, {
      headers,
    });
  } catch (err) {
    console.log(err);
    return new Response("An error occurred", {
      status: 400,
      headers,
    });
  }
};

export const POST = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    const { amount, toPubkey } = validatedQueryParams(requestUrl);

    const body: ActionPostRequest = await req.json();

    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch (err) {
      return new Response('Invalid "account" provided', {
        status: 400,
        headers,
      });
    }

    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL! || clusterApiUrl("testnet")
    );

    const transferSolInstruction = SystemProgram.transfer({
      fromPubkey: account,
      toPubkey: toPubkey,
      lamports: amount * LAMPORTS_PER_SOL,
    });

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    const transaction = new Transaction({
      feePayer: account,
      blockhash,
      lastValidBlockHeight,
    }).add(transferSolInstruction);

    // Serialize the transaction to send back to the client
    const serializedTransaction = transaction
      .serialize({
        requireAllSignatures: false,
      })
      .toString("base64");

    // Generate an HMAC token based on the user's public key
    const secretKey = process.env.SECRET_KEY || ""; // Secret key used for HMAC
    const token = createHmac("sha256", secretKey)
      .update(account.toBase58())
      .digest("hex"); // Generate HMAC token

    const payload: ExtendedActionPostResponse = {
      transaction: serializedTransaction,
      message: `Pay ${amount} SOL to unlock BlinksGPT`,
      token, // Include the HMAC token in the response
    };

    return new Response(JSON.stringify(payload), {
      headers,
      status: 200,
    });
  } catch (err) {
    console.log(err);
    return new Response("An error occurred", {
      status: 400,
      headers,
    });
  }
};

function validatedQueryParams(requestUrl: URL) {
  let toPubkey: PublicKey = BLINKS_SOL_ADDRESS;
  let amount: number = BLINKS_SOL_AMOUNT;

  try {
    if (requestUrl.searchParams.get("to")) {
      toPubkey = new PublicKey(requestUrl.searchParams.get("to")!);
    }
  } catch (err) {
    throw "Invalid input query parameter: to";
  }

  try {
    if (requestUrl.searchParams.get("amount")) {
      amount = parseFloat(requestUrl.searchParams.get("amount")!);
    }

    if (amount <= 0) throw "amount is too small";
  } catch (err) {
    throw "Invalid input query parameter: amount";
  }

  return {
    amount,
    toPubkey,
  };
}

export const OPTIONS = async (req: Request) => {
  return new Response(null, { headers });
};

