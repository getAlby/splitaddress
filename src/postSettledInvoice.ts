import express from "express";
import { Webhook } from "svix";
import { prismaClient } from "./prismaClient";
import { LightningAddress } from "alby-tools";
import { Invoice } from "./Invoice";
import { webln } from "alby-js-sdk";
import "websocket-polyfill";
import * as crypto from "node:crypto";
global.crypto = crypto;

export async function postSettledInvoice(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const nwcUri = process.env.NWC_URI;
    if (!nwcUri) {
      throw new Error("No NWC URI set");
    }
    const webhookSecret = process.env.WEBHOOK_SECRET;

    let invoice: Invoice;
    if (!webhookSecret) {
      console.warn("No webhook secret set");
      invoice = req.body;
    } else {
      const headers = {
        "svix-id": req.headers["svix-id"] as string,
        "svix-timestamp": req.headers["svix-timestamp"] as string,
        "svix-signature": req.headers["svix-signature"] as string,
      };
      if (
        !headers["svix-id"] ||
        !headers["svix-timestamp"] ||
        !headers["svix-signature"]
      ) {
        throw new Error("Request missing one or more svix headers");
      }

      const wh = new Webhook(webhookSecret);
      invoice = wh.verify((req as any).rawBody, headers) as Invoice;
    }

    if (!invoice.payer_name) {
      throw new Error("No payer_name in invoice");
    }

    const lightningAddress = await prismaClient.lightningAddress.findUnique({
      where: {
        username: invoice.payer_name,
      },
      include: {
        splits: true,
      },
    });
    if (!lightningAddress) {
      throw new Error("No lightning address found for " + invoice.payer_name);
    }

    const noswebln = new webln.NostrWebLNProvider({
      nostrWalletConnectUrl: nwcUri,
    });

    await noswebln.enable();

    for (const split of lightningAddress.splits) {
      const splitAmount = Math.floor(invoice.amount * (split.percentage / 100));
      const fee = Math.ceil(splitAmount / 100);
      const splitAmountMinusFee = splitAmount - fee;

      try {
        if (splitAmountMinusFee >= 1) {
          const lightningAddress = new LightningAddress(
            split.recipientLightningAddress
          );
          await lightningAddress.fetch();
          const splitInvoice = await lightningAddress.requestInvoice({
            satoshi: splitAmountMinusFee,
            comment: "SplitAddress sats",
          });

          const response = (await noswebln.sendPayment(
            splitInvoice.paymentRequest
          )) as { preimage: string };
          if (response.preimage) {
            console.log("Paid invoice", {
              preimage: response.preimage,
              splitId: split.id,
              username: invoice.payer_name,
              paymentHash: invoice.payment_hash,
              splitAmount: splitAmountMinusFee,
              // fee: response.fee,
              originalInvoiceAmount: invoice.amount,
            });
          } else {
            throw new Error("Payment sent but no preimage in response");
          }
        } else {
          console.log("Skipped split payment", {
            splitId: split.id,
            username: invoice.payer_name,
            paymentHash: invoice.payment_hash,
          });
        }
      } catch (error) {
        console.error("Failed to send split payment", {
          error,
          splitId: split.id,
          username: invoice.payer_name,
          paymentHash: invoice.payment_hash,
        });
      }
    }

    noswebln.close();

    return res.status(200).end();
  } catch (error) {
    next(error);
  }
}
