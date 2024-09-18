import { Hono } from "hono";
import Stripe from "stripe";
import { z } from "zod";

const terminalRoutes = new Hono();
const stripeKey = process.env.STRIPE_TEST_KEY || "";
const stripe = new Stripe(stripeKey);

terminalRoutes.get("/connection_token", async (c) => {
    let connectionToken = await stripe.terminal.connectionTokens.create();
    return c.json({ secret: connectionToken.secret });
})

terminalRoutes.post("/create_payment_intent", async (c) => {
    const body = await c.req.parseBody();
    const scheme = z
        .object({
            amount: z.number(),
        })
        .safeParse(body);

    if (!scheme.success) {
        return c.json({ message: scheme.error.issues }, 400);
    }

    const { amount } = scheme.data;

    // For Terminal payments, the 'payment_method_types' parameter must include
    // 'card_present'.
    // To automatically capture funds when a charge is authorized,
    // set `capture_method` to `automatic`.
    const intent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'eur',
        payment_method_types: [
            'card_present',
        ],
        capture_method: 'manual',
    });
    return c.json(intent);
});

terminalRoutes.get("/terminals", async (c) => {
    const terminals = await stripe.terminal.readers.list({
        limit: 1000,
    });
    return c.json(terminals);
});

terminalRoutes.get("/terminal/:terminalId", async (c) => {
    const { terminalId } = c.req.param();
    const terminal = await stripe.terminal.readers.retrieve(terminalId);
    return c.json(terminal);
});

export default terminalRoutes;