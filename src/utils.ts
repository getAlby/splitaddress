import * as crypto from "crypto";

export function getFullLightningAddress(address: string) {
  return `${address}@${process.env.DOMAIN}`;
}

export function getMetadata(username) {
  return [
    ["text/identifier", username],
    ["text/plain", `Sats for ${username}`], // TODO: username is meaningless here, it should be the split users
  ];
}

export function getMetadataHash(username) {
  const buf = Buffer.from(JSON.stringify(getMetadata(username)), "utf8");
  return crypto.createHash("sha256").update(buf).digest("hex");
}
