export function getFullLightningAddress(address: string) {
  return `${address}@${process.env.DOMAIN}`
}