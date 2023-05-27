import express from "express";
import { Webhook } from "svix";
import { prismaClient } from "./prismaClient";
import { LightningAddress } from "alby-tools";

type Invoice = {
  amount: number;
  comment?: string;
  created_at: string;
  creation_date: number;
  currency: string;
  custom_records: Record<string, string>;
  description_hash: null;
  expires_at: string;
  expiry: number;
  fiat_currency: string;
  fiat_in_cents: number;
  identifier: string;
  keysend_message?: string;
  memo: string;
  payer_name: string;
  payer_pubkey?: string;
  payment_hash: string;
  payment_request: string;
  r_hash_str: string;
  settled: boolean;
  settled_at: string;
  state: string;
  type: string;
  value: number;
  metadata?: {
    // TODO: add typings
    payer_data?: unknown;
    zap_request?: unknown;
  };
};

export async function postSettledInvoice(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const lndhubUser = process.env.LNDHUB_USER;
    const lndhubPassword = process.env.LNDHUB_PASSWORD;
    if (!lndhubUser || !lndhubPassword) {
      throw new Error("No LNDHUB credentials set");
    }

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

          const userAgent = "Alby SplitAddress";

          const authResponse = await fetch("https://ln.getalby.com/auth", {
            method: "POST",
            headers: {
              "User-Agent": userAgent,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              login: lndhubUser,
              password: lndhubPassword,
            }),
          });
          if (!authResponse.ok) {
            throw new Error(
              "Failed to authenticate to lndhub: " + (await authResponse.text())
            );
          }

          const authResponseJson = await authResponse.json();
          const accessToken = authResponseJson.access_token;
          if (!accessToken) {
            throw new Error("No access_token found in response");
          }

          const paymentResponse = await fetch(
            `https://ln.getalby.com/v2/payments/bolt11`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "User-Agent": userAgent,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                invoice: splitInvoice.paymentRequest,
              }),
            }
          );

          if (!paymentResponse.ok) {
            throw new Error(
              "Failed to pay invoice: " + (await paymentResponse.text())
            );
          }

          const paymentResponseJson = await paymentResponse.json();

          if (paymentResponseJson.payment_preimage) {
            console.log("Paid invoice", {
              preimage: paymentResponseJson.payment_preimage,
              splitId: split.id,
              username: invoice.payer_name,
              paymentHash: invoice.payment_hash,
              splitAmount: splitAmountMinusFee,
              fee: paymentResponseJson.fee,
              originalInvoiceAmount: invoice.amount,
            });
          } else {
            throw new Error("No preimage in payment result");
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

    return res.status(200).end();
  } catch (error) {
    next(error);
  }
}
