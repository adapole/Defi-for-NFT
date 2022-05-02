This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, git clone the repository and install all dependencies:

```bash
git clone https://github.com/adapole/Defi-for-NFT.git
cd nft-dapp
npm install
```

Setup the .env and/or .env.local variables. First create a purestake account for algorand and set the api-key to the .env.local variable

```bash
NEXT_PUBLIC_PURESTAKE_API=YOUR-PURESTAKE-API-KEY
TESTACCOUNT_MENMONIC=''
```

Next create a mongodb database, since we use Prisma it's adviced to use mongodb Atlas but it can work for local db too. For mongodb atlas it will look like:

```bash
DATABASE_URL="mongodb+srv://someusername:somepassword@somecluster.something.mongodb.net/<DB-NAME>?retryWrites=true&w=majority"
```

Initialize Prisma and push the database models to your database

```bash
npx prisma init
npx prisma db push
```

It takes sometime to sync with @prisma/client, if you get errors delete any similar table name from the db and push prisma db again, then run

```bash
npx prisma generate
```

And finally create a circle api, and setup the .env variable to:

```bash
BEARER_TOKEN=YOUR-CIRCLE-API
```

And get the publickey from circle. Go to [constants.ts](/nft-dapp/lib/helpers/constants.ts) and replace the publickey with your own

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
