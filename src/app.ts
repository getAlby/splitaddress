import express from "express";
import { createSplits } from "./createSplits";
import { getLnurlpData } from "./getLnurlpData";
import { getLnurlpCallback } from "./getLnurlpCallback";
import { postSettledInvoice } from "./postSettledInvoice";

const port = process.env.PORT || 8080;
const app = express();

app.use(
  express.json({
    verify: (req, res, buf) => {
      // save raw body for svix verification
      (req as any).rawBody = buf.toString();
    },
  })
);

app
  .get("/", (req, res) => {
    res.send({
      message: "Hello, World!",
    });
  })
  .post("/splits", createSplits)
  .get("/.well-known/lnurlp/:username", getLnurlpData)
  .get("/lnurlp/:username/callback", getLnurlpCallback)
  .post("/webhook", postSettledInvoice);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send(err.message);
});

app.listen(port, () => {
  console.log(`Application listening on port ${port}`);
});
