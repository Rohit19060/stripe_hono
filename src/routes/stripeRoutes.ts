import { Hono } from "hono";
import Stripe from "stripe";

const stripeRoutes = new Hono();
const stripeKey = process.env.STRIPE_TEST_KEY || "";
const stripe = new Stripe(stripeKey);

stripeRoutes.get("/payment_intent/:paymentIntentId", async (c) => {
  const { paymentIntentId } = c.req.param();
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return c.json({ success: true, paymentIntent });
  } catch (error) {
    console.error("Error retrieving payment intent:", error);
    return c.json({ success: false, error: error });
  }
});

export { stripeRoutes };
