import { Hono } from "hono";
import Stripe from "stripe";
import { z } from "zod";

const stripeTestKey = process.env.STRIPE_TEST_KEY || "";
const stripe = new Stripe(stripeTestKey);

const app = new Hono();

app.get("/", async (x) => {
  return x.json({ message: "Stripe Backend Template" });
});

app.delete("/remove_card/:cardId", async (c) => {
  const body = c.req.param();
  const schema = z
    .object({
      cardId: z.string(),
    })
    .safeParse(body);

  if (!schema.success) {
    return c.json({ message: schema.error.issues }, 400);
  }

  const { cardId } = schema.data;
  return await stripe.paymentMethods
    .detach(cardId)
    .then(() => {
      return c.json({ message: "Payment method removed successfully" });
    })
    .catch((error) => {
      return c.json({ message: error.raw.message }, 400);
    });
});

app.post("/checkout_initiate", async (c) => {
  const body = await c.req.parseBody();
  const schema = z
    .object({
      email: z.string().email(),
    })
    .safeParse(body);

  if (!schema.success) {
    return c.json({ message: schema.error.issues }, 400);
  }

  const { email } = schema.data;

  const customers = await stripe.customers.list();
  var customer = customers.data.find((c) => c.email === email);
  if (!customer) {
    customer = await stripe.customers.create({ email });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: 200 * 100,
    currency: "inr",
    customer: customer.id,
  });

  return c.json({
    paymentIntentId: paymentIntent.id,
    paymentIntent: paymentIntent.client_secret,
  });
});

app.post("/add_card_initiate", async (c) => {
  const body = await c.req.parseBody();
  const schema = z
    .object({
      email: z.string().email(),
    })
    .safeParse(body);

  if (!schema.success) {
    return c.json({ message: schema.error.issues }, 400);
  }

  const { email } = schema.data;

  const customers = await stripe.customers.list();
  var customer = customers.data.find((c) => c.email === email);
  if (!customer) {
    customer = await stripe.customers.create({ email: email });
  }
  var setupIntent = await stripe.setupIntents.create({ customer: customer.id });

  var emphemeralKey = await stripe.ephemeralKeys.create(
    { customer: customer.id },
    { apiVersion: "2023-10-16" }
  );

  return c.json({
    setupIntentSecret: setupIntent.client_secret,
    customerId: customer.id,
    emphemeralKeySecret: emphemeralKey.secret,
  });
});

app.post("/payment_methods", async (c) => {
  const body = await c.req.parseBody();
  const schema = z
    .object({
      customerId: z.string(),
    })
    .safeParse(body);
  if (!schema.success) {
    return c.json({ message: schema.error.issues }, 400);
  }

  const { customerId } = schema.data;

  return await stripe.customers
    .listPaymentMethods(customerId)
    .then((paymentMethods) => {
      return c.json({
        message: "Payment methods fetched successfully",
        data: paymentMethods.data,
      });
    })
    .catch((error) => {
      return c.json({ message: error.raw.message }, 400);
    });
});

export default app;
