# Install dependencies only when needed
FROM node:18-alpine AS builder
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app
#COPY . .
COPY package.json ./
COPY yarn.lock ./
COPY tsconfig.json ./
COPY ./prisma ./
COPY ./src ./src

RUN yarn install --frozen-lockfile

RUN --mount=type=secret,id=DATABASE_URL \
    DATABASE_URL="$(cat /run/secrets/DATABASE_URL)" \
    yarn db:migrate:deploy

RUN --mount=type=secret,id=DATABASE_URL \
    DATABASE_URL="$(cat /run/secrets/DATABASE_URL)" \
    yarn build

# Production image, copy all the files and run node
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app ./

CMD ["yarn", "start"]

