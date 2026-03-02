import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs';
import * as BetterSqlite3 from 'better-sqlite3';
const Database = (BetterSqlite3 as any).default ?? BetterSqlite3;
type DbInstance = BetterSqlite3.Database;

@Injectable()
export class ContactService implements OnModuleInit {
  private readonly logger = new Logger(ContactService.name);
  private db: DbInstance;

  onModuleInit() {
    const dataDir = join(process.cwd(), 'data');
    // Ensure the data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = join(dataDir, 'masaravie.db');
    this.db = new Database(dbPath);
    this.logger.log(`Connected to SQLite database at ${dbPath}`);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  save(name: string, email: string, message: string): void {
    const stmt = this.db.prepare(
      'INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)',
    );
    stmt.run(
      String(name).trim().slice(0, 200),
      String(email).trim().slice(0, 200),
      String(message).trim().slice(0, 2000),
    );
    this.logger.log(`New contact submission saved — from: ${email}`);
  }
}
