import express from "express";
import { prismaClient } from "./prismaClient";
import Haikunator from "haikunator";
import { getFullLightningAddress as getLightningAddress } from "./utils";

type CreateSplitsRequest = Record<string, number>;
export async function createSplits(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const splits = req.body as CreateSplitsRequest;
    const percentageSum = Object.values(splits).reduce((a, b) => a + b, 0);
    if (percentageSum === 0) {
      return res.status(400).send("No splits provided");
    }
    if (percentageSum > 100) {
      return res.status(400).send("Split percentages exceed 100%");
    }
    if (percentageSum !== Math.floor(percentageSum)) {
      return res.status(400).send("Split percentages should be whole numbers");
    }

    // TODO: verify lightning addresses

    const lightningAddress = await prismaClient.lightningAddress.create({
      data: {
        username: new Haikunator().haikunate({
          delimiter: "",
          tokenLength: 2,
        }),
        splits: {
          createMany: {
            data: Object.entries(splits).map((split) => ({
              recipientLightningAddress: split[0],
              percentage: split[1],
            })),
          },
        },
      },
    });

    res.send(getLightningAddress(lightningAddress.username));
  } catch (error) {
    next(error);
  }
}
