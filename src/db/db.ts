import { Database } from "bun:sqlite";

const db = new Database("./mydb.sqlite", { create: true });

db.exec(
  "CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, business_type TEXT, country TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, account_id TEXT);"
);

export { db };
