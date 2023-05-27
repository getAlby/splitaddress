import express from "express";
import { prismaClient } from "./prismaClient";
import { LightningAddress } from "alby-tools";

export async function getLnurlpData(
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

    // proxy request to get alby lnurlp info
    const ln = new LightningAddress(receiverAddress);
    // fetch the LNURL data
    await ln.fetch();
    if (!ln.lnurlpData) {
      throw new Error("Could not retrieve lnurlpData from " + receiverAddress);
    }

    // FIXME: this is using the metadata / description of the receiver account instead of the unique lightning address
    return res.json({
      allowsNostr: true,
      callback: `${process.env.DOMAIN}/lnurlp/${username}/callback`,
      maxSendable: ln.lnurlpData.rawData.maxSendable,
      metadata: ln.lnurlpData.rawData.metadata,
      minSendable: ln.lnurlpData.rawData.minSendable,
      nostrPubkey: ln.lnurlpData.rawData.nostrPubkey,
      status: "OK",
      tag: "payRequest",
    });
  } catch (error) {
    next(error);
  }
}
