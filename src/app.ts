import { Hono } from "hono";
import { showRoutes } from "hono/dev";
import { cardRoutes } from "./routes/cardRoutes";
import { connectedAccountRouter } from "./routes/connectedAccount";
import { stripeRoutes } from "./routes/stripeRoutes";
import terminalRoutes from "./routes/terminals";

const app = new Hono();

app.route("/stripe", stripeRoutes);
app.route("/card", cardRoutes);
app.route("/connected_account", connectedAccountRouter);
app.route("/terminals", terminalRoutes);

// Display the list of routes
showRoutes(app);

export default app;
