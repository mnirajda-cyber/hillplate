import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
export function openStore(directory){mkdirSync(directory,{recursive:true});const db=new DatabaseSync(join(directory,'hillplate.sqlite'));db.exec(`PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000;PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS diary(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),date TEXT NOT NULL,data TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS diary_owner_date ON diary(user_id,date);
CREATE TABLE IF NOT EXISTS targets(user_id TEXT PRIMARY KEY REFERENCES users(id),data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS menus(date TEXT NOT NULL,location_id TEXT NOT NULL,data TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(date,location_id));
CREATE TABLE IF NOT EXISTS state(key TEXT PRIMARY KEY,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS nutrition(date TEXT NOT NULL,food_key TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(date,food_key));
CREATE TABLE IF NOT EXISTS login_attempts(key TEXT PRIMARY KEY,attempts INTEGER NOT NULL,until INTEGER NOT NULL);
`);return {db,get(key){const r=db.prepare('SELECT data FROM state WHERE key=?').get(key);return r?JSON.parse(r.data):null},set(key,value){db.prepare('INSERT INTO state VALUES(?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data').run(key,JSON.stringify(value))},transaction(fn){db.exec('BEGIN IMMEDIATE');try{const v=fn();db.exec('COMMIT');return v}catch(e){db.exec('ROLLBACK');throw e}},close(){db.close()}}}
