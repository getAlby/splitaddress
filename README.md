# SplitAddress

Generate a random lightning address that forwards incoming payments to multiple lightning addresses.

Try it out:

```bash
curl --location --request POST 'https://splitaddress.fly.dev/splits' \
--header 'Content-Type: application/json' \
--data-raw '{
	"hello@getalby.com": 50,
	"roland@getalby.com": 50
}'
```

This will return an address like `divinehill76@splitaddress.fly.dev`. Any sats sent to this address will be forwarded to the splits.

Please note: 1% will be reserved for each split for fees. At least 2 sats must be allocated to a split for the payment to be sent. Any unspent sats will be consumed by the receiver Alby account (see .env.example). The request split percentages must be whole numbers and add up to exactly 100%.

## Installation

Run `yarn install`

Run `cp .env.example .env`

Run `yarn db:migrate:deploy` (if developing with Docker make sure to run Run `yarn docker:start` first)

## Development (Docker)

Run `yarn docker:start`

Run `yarn dev`

## Development (local)

Run `yarn dev`
