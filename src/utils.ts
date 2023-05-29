import * as crypto from "crypto";

export function getFullLightningAddress(address: string) {
  return `${address}@${process.env.DOMAIN}`;
}

export function getMetadataForUsername(username: string) {
  return [
    ["text/identifier", username],
    ["text/plain", `Sats for ${username}`], // TODO: username is meaningless here, it should be the split users
  ];
}

export function getMetadataHash(content: string) {
  const buf = Buffer.from(content, "utf8");
  return crypto.createHash("sha256").update(buf).digest("hex");
}
