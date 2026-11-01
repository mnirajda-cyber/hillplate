import {DatabaseSync} from 'node:sqlite';
import {existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {food,targets} from './validation.mjs';
export function readLegacy(root){const base=join(root,'.wrangler/state/v3/d1/miniflare-D1DatabaseObject');if(!existsSync(base))return {entries:[],goals:null};for(const file of readdirSync(base).filter(x=>x.endsWith('.sqlite')&&x!=='metadata.sqlite')){let db;try{db=new DatabaseSync(join(base,file),{readOnly:true});const users=db.prepare('SELECT DISTINCT user_id FROM entries').all();if(users.length>1)continue;const entries=db.prepare('SELECT * FROM entries').all().map(r=>food.parse(r));const g=users.length===1?db.prepare('SELECT * FROM goals WHERE user_id=?').all(users[0].user_id):[];return {entries,goals:g.length===1?targets.parse(g[0]):null}}catch{}finally{db?.close()}}return {entries:[],goals:null}}
export function importLegacy(store,userId,legacy){for(const f of legacy.entries)store.db.prepare('INSERT INTO diary VALUES(?,?,?,?)').run(randomUUID(),userId,f.date,JSON.stringify(f));if(legacy.goals)store.db.prepare('INSERT OR REPLACE INTO targets VALUES(?,?)').run(userId,JSON.stringify(legacy.goals));store.set('legacyImported',true)}
