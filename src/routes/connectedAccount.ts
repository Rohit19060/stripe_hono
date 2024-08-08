// src/routes/connectedAccount.ts

import { Context, Hono } from "hono";
import Stripe from "stripe";
import { z } from "zod";
import { db } from "../db/db";
import { getAccountId, updateAccount } from "../db/db_queries";

const stripeKey = process.env.STRIPE_TEST_KEY || "";
const stripe = new Stripe(stripeKey);

const connectedAccountRouter = new Hono();


connectedAccountRouter.post('/add-external-account', async (c: Context) => {

  const body = await c.req.parseBody();
  const scheme = z
    .object({
      accountId: z.string(),
    })
    .safeParse(body);

  if (!scheme.success) {
    return c.json({ message: scheme.error.issues }, 400);
  }

  const { accountId } = scheme.data;

  try {
    // Add the external account to the Stripe account
    const externalAccount = await stripe.accounts.createExternalAccount(accountId, {
      external_account: "tok_visa_debit"
      ,
    });

    return c.json(externalAccount);
  } catch (error) {
    console.error(error);
    return c.json({ error }, 400);
  }
});


connectedAccountRouter.post("/updateAccountIdViaEmail", async (c: Context) => {
  const body = await c.req.parseBody();
  const scheme = z
    .object({
      email: z.string().email(),
      accountId: z.string(),
    })
    .safeParse(body);

  if (!scheme.success) {
    return c.json({ message: scheme.error.issues }, 400);
  }

  const { email, accountId } = scheme.data;

  try {
    const account = await updateAccount(accountId, email);
    return c.json({ message: "success", account });
  } catch (err) {
    return c.json({ err }, 400);
  }
});

// Create a connected account
connectedAccountRouter.post("/create", async (c: Context) => {
  //   const { email, businessType, country } = await c.req.json();
  const body = await c.req.parseBody();

  const schema = z
    .object({
      email: z.string().email(),
      country: z.string(),
      businessName: z.string(),
      url: z.string(),
      addressLine1: z.string(),
      city: z.string(),
      state: z.string(),
      postalCode: z.string(),
      phone: z.string(),
      productDescription: z.string(),
      supportUrl: z.string().url(),
      mcc: z.string(),
      first_name: z.string(),
      last_name: z.string(),
    })
    .safeParse(body);

  if (!schema.success) {
    return c.json({ message: schema.error.issues }, 400);
  }

  const {
    email, country,
    businessName,
    url,
    addressLine1,
    city,
    state,
    postalCode,
    first_name,
    last_name,
    productDescription,
    phone,
    mcc,
    supportUrl,
  } = schema.data;

  try {
    const account = await stripe.accounts.create({
      country: country || "DE",
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      controller: {
        requirement_collection: "application",
        fees: {
          payer: "application",
        },
        losses: {
          payments: "application",
        },
        stripe_dashboard: {
          type: "none",
        },
      },
      business_type: "individual",
      business_profile: {
        name: businessName,
        product_description: productDescription,
        url,
        support_email: email,
        support_phone: phone,
        support_url: supportUrl,
        mcc,
      },

      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip: "8.8.8.8",
      },
      individual: {
        first_name,
        last_name,
        email,
        phone,
        dob: {
          day: 1,
          month: 1,
          // "Must be at least 13 years of age to use Stripe"
          year: 2011,
        },
      },
      company: {
        address: {
          line1: addressLine1,
          city,
          state,
          postal_code: postalCode,
          country,
        },
        phone,
        name: businessName,
      },

      settings: {
        payments: {
          statement_descriptor: "MYBUSINESS",
        },
      },
    });
    let accountId = account.id;
    await db.run(
      "INSERT INTO accounts (email, business_type, country, account_id) VALUES (?, ?, ?, ?);",
      [email, "", country, accountId]
    );
    return c.json({ message: "success" });
  } catch (error) {
    return c.json({ error }, 400);
  }
});

// Update a connected account
connectedAccountRouter.post("/updateDetails", async (c: Context) => {
  const headers = await c.req.header("host");
  // return c.json({ message: "success", headers });
  const body = await c.req.parseBody();

  const scheme = z
    .object({
      email: z.string().email(),
      businessName: z.string(),
      url: z.string(),
      addressLine1: z.string(),
      city: z.string(),
      state: z.string(),
      postalCode: z.string(),
      country: z.string(),
      phone: z.string(),
      productDescription: z.string(),
      supportUrl: z.string().url(),
      mcc: z.string(),
      first_name: z.string(),
      last_name: z.string(),
    })
    .safeParse(body);

  if (!scheme.success) {
    return c.json({ message: scheme.error }, 400);
  }

  const {
    email,
    businessName,
    url,
    addressLine1,
    city,
    state,
    postalCode,
    country,
    first_name,
    last_name,
    productDescription,
    phone,
    mcc,
    supportUrl,
  } = scheme.data;

  let accountId = await getAccountId(email);
  return await stripe.accounts
    .update(accountId, {
      business_type: "individual",
      business_profile: {
        name: businessName,
        product_description: productDescription,
        url,
        support_email: email,
        support_phone: phone,
        support_url: supportUrl,
        mcc,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip: "8.8.8.8",
      },
      email,
      individual: {
        first_name,
        last_name,
        email,
        phone,
        dob: {
          day: 1,
          month: 1,
          // "Must be at least 13 years of age to use Stripe"
          year: 2011,
        },
      },
      company: {
        address: {
          line1: addressLine1,
          city,
          state,
          postal_code: postalCode,
          country,
        },
        phone,
        name: businessName,
      },

      settings: {
        payments: {
          statement_descriptor: "MYBUSINESS",
        },
      },
      // tos_acceptance: {
      //   date: Math.floor(Date.now() / 1000),
      //   ip: "127.0.0.1",
      // },
    })
    .then((account) => {
      console.log(account);
      return c.json({ message: "success", account });
    })
    .catch((error) => {
      console.error(error);
      return c.json({ message: error.raw.message }, 400);
    });
});

// create back account token

connectedAccountRouter.post("/createBackAccountToken", async (c: Context) => {
  stripe.tokens
    .create({
      bank_account: {
        country: "DE",
        currency: "eur",
        account_holder_name: "Jenny Rosen",
        account_holder_type: "individual",
        account_number: "DE89370400440532013000",
      },
    })
    .then((token) => {
      return stripe.accounts.update("acct_1PizIx4EUuOCjaF1", {
        external_account: token.id,
      });
    })
    .then((account) => {
      console.log(account);
    })
    .catch((error) => {
      console.error(error);
    });
});

// Retrieve a connected account
connectedAccountRouter.post("/account", async (c: Context) => {
  const body = await c.req.parseBody();

  const scheme = z
    .object({
      email: z.string().email(),
    })
    .safeParse(body);

  if (!scheme.success) {
    return c.json({ message: scheme.error.issues }, 400);
  }

  const { email } = scheme.data;

  let accountId = await getAccountId(email);

  try {
    const account = await stripe.accounts.retrieve(accountId);
    return c.json(account);
  } catch (error) {
    return c.json({ error }, 400);
  }
});

// Delete a connected account
connectedAccountRouter.delete("/delete", async (c: Context) => {
  const body = await c.req.parseBody();

  const scheme = z
    .object({
      email: z.string().email(),
    })
    .safeParse(body);

  if (!scheme.success) {
    return c.json({ message: scheme.error.issues }, 400);
  }

  const { email } = scheme.data;
  let accountId = await getAccountId(email);

  try {
    const deletedAccount = await stripe.accounts.del(accountId);
    return c.json(deletedAccount);
  } catch (error) {
    return c.json({ error }, 400);
  }
});

connectedAccountRouter.get("/all-accounts", async (c: Context) => {
  try {
    const accounts = await stripe.accounts.list({ limit: 10 });
    return c.json(accounts);
  } catch (error) {
    return c.json({ error }, 400);
  }
});

export { connectedAccountRouter };

