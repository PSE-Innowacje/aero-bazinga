import pg from "pg";
import "dotenv/config";

// Return DATE columns as "yyyy-MM-dd" strings instead of JS Date objects
// Prevents timezone-related off-by-one day errors
const DATE_OID = 1082;
pg.types.setTypeParser(DATE_OID, (val: string) => val);

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
