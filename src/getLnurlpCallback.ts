import express from "express";
import { prismaClient } from "./prismaClient";
import { LightningAddress } from "alby-tools";

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

    // proxy request
    const ln = new LightningAddress(receiverAddress);
    // fetch the LNURL data
    await ln.fetch();
    if (!ln.lnurlpData) {
      throw new Error("Could not retrieve lnurlpData from " + receiverAddress);
    }

    const invoiceParams = {
      // FIXME: typings
      ...(req.query as any),
      payerdata: JSON.stringify({
        // FIXME: what field should be used here?
        name: username,
      }),
    };
    console.log("Requesting invoice with params", invoiceParams);
    const invoice = await ln.generateInvoice(invoiceParams);

    const response = {
      status: "OK",
      successAction: {
        tag: "message",
        message: "Thanks, sats received!",
      },
      routes: [],
      pr: invoice.paymentRequest,
    };
    return res.json(response);
  } catch (error) {
    next(error);
  }
}
