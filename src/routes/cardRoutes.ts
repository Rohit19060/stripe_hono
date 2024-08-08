import { Hono } from "hono";
import Stripe from "stripe";
import { z } from "zod";
import { getAccountId } from "../db/db_queries";

const cardRoutes = new Hono();
// const stripeTestKey = process.env.STRIPE_TEST_KEY || "";
const stripeKey = process.env.STRIPE_TEST_KEY || "";
const stripe = new Stripe(stripeKey);

cardRoutes.delete("/remove_card/:cardId", async (c) => {
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

cardRoutes.get("/checkout_initiate", async (c) => {
  // const body = await c.req.parseBody();
  // const schema = z
  //   .object({
  //     email: z.string().email(),
  //   })
  //   .safeParse(body);

  // if (!schema.success) {
  //   return c.json({ message: schema.error.issues }, 400);
  // }

  // const { email } = schema.data;
  let email = "rohitjain19060@gmail.com";

  const customers = await stripe.customers.list();
  var customer = customers.data.find((c) => c.email === email);
  if (!customer) {
    customer = await stripe.customers.create({ email });
  }

  const accountId = await getAccountId(email);

  console.log(customer);

  let totalAmount = 200 * 100;
  let stripeFee = totalAmount * 0.02;
  let ourFee = totalAmount * 0.02;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalAmount,
    currency: "eur",
    customer: customer.id,
    application_fee_amount: stripeFee + ourFee,
    transfer_data: {
      destination: accountId,
    },
  });

  console.log(paymentIntent);

  return c.json({
    paymentIntentId: paymentIntent.id,
    paymentIntent: paymentIntent.client_secret,
  });
});

cardRoutes.get("/add_card_initiate", async (c) => {
  // const body = await c.req.parseBody();
  // const schema = z
  //   .object({
  //     email: z.string().email(),
  //   })
  //   .safeParse(body);

  // if (!schema.success) {
  //   return c.json({ message: schema.error.issues }, 400);
  // }

  // const { email } = schema.data;
  let email = "rohitjain19060@gmail.com";

  console.log(email);

  try {
    const customers = await stripe.customers.list();
    var customer = customers.data.find((c) => c.email === email);
    if (!customer) {
      customer = await stripe.customers.create({ email: email });
    }
    console.log("customer", customer);
    var setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
    });

    console.log(setupIntent);

    var emphemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: "2023-10-16" }
    );

    return c.json({
      setupIntentSecret: setupIntent.client_secret,
      customerId: customer.id,
      emphemeralKeySecret: emphemeralKey.secret,
    });
  } catch (error) {
    return c.json({ message: error }, 400);
  }
});

cardRoutes.get("/payment_methods", async (c) => {
  // const body = await c.req.parseBody();
  // const schema = z
  //   .object({
  //     customerId: z.string(),
  //   })
  //   .safeParse(body);
  // if (!schema.success) {
  //   return c.json({ message: schema.error.issues }, 400);
  // }

  // const { customerId } = schema.data;
  let email = "rohitjain19060@gmail.com";

  console.log(email);
  const customers = await stripe.customers.list();
  var customer = customers.data.find((c) => c.email === email);
  if (!customer) {
    customer = await stripe.customers.create({ email: email });
  }
  console.log("customer", customer);
  let customerId = customer.id;

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

export { cardRoutes };
