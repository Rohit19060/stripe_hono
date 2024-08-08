import { db } from "./db";

async function getAccountId(email: string): Promise<string> {
  try {
    const stmt = db.prepare(
      "SELECT account_id FROM accounts WHERE email = ? LIMIT 1"
    );
    const row = stmt.get(email);
    return row ? row.account_id : "";
  } catch (error) {
    console.error("Error fetching account ID:", error);
    throw error;
  }
}

async function getAccount(accountId: string): Promise<any> {
  try {
    const stmt = db.prepare(
      "SELECT * FROM accounts WHERE account_id = ? LIMIT 1"
    );
    const row = stmt.get(accountId);
    return row || null; // Return the row or null if no data found
  } catch (error) {
    console.error("Error fetching account:", error);
    throw error;
  }
}

async function updateAccount(accountId: string, email: string) {
  try {
    const stmt = db.prepare(
      "UPDATE accounts SET account_id = ? where email = ?"
    );
    const row = stmt.run(accountId, email);
    return row;
  } catch (error) {
    console.error("Error updating account:", error);
    throw error;
  }
}

export { getAccount, getAccountId, updateAccount };
