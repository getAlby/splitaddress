import express from "express";
import { prismaClient } from "./prismaClient";
import { getMetadataForUsername, getMetadataHash } from "./utils";
import { Invoice } from "./Invoice";

export async function getLnurlpCallback(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const receiverAddress = process.env.ALBY_RECEIVER_ADDRESS;
    if (!receiverAddress) {
      throw new Error("No ALBY_RECEIVER_ADDRESS set in .env");
    }

    const username = req.params["username"];
    const lightningAddress = await prismaClient.lightningAddress.findUnique({
      where: {
        username,
      },
    });
    if (!lightningAddress) {
      return res
        .status(404)
        .json({ status: "ERROR", reason: "lightning address does not exist" });
    }

    const amountInMsat = parseInt((req.query as any)["amount"]);
    if (!amountInMsat) {
      return res
        .status(400)
        .json({ status: "ERROR", reason: "amount is missing" });
    }
    const amount = amountInMsat / 1000;

    const invoiceResponse = await fetch(
      "https://getalby.com/api/invoices.json",
      {
        method: "POST",
        body: JSON.stringify({
          amount: amount,
          memo: `SplitAddress ${username}`,
          // TODO: handle metadata hash for nostr zaps
          description_hash: req.query.nostr
            ? getMetadataHash(req.query.nostr as string)
            : getMetadataHash(JSON.stringify(getMetadataForUsername(username))),
          payer_name: username,
        }),
        headers: {
          "Content-Type": "application/json",
          "lightning-address": receiverAddress,
        },
      }
    );

    if (!invoiceResponse.ok) {
      throw new Error(
        "Failed to request invoice: " + (await invoiceResponse.text())
      );
    }

    const invoice = (await invoiceResponse.json()) as Invoice;

    const response = {
      status: "OK",
      successAction: {
        tag: "message",
        message: "Thanks, sats received!",
      },
      routes: [],
      pr: invoice.payment_request,
    };
    return res.json(response);
  } catch (error) {
    next(error);
  }
}
