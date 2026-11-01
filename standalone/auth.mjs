import {scrypt,randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt);
const OPTIONS={N:32768,r:8,p:3,maxmem:64*1024*1024};
export const digest=value=>createHash('sha256').update(value).digest('hex');
export async function hashPassword(password){const salt=randomBytes(16).toString('hex');const hash=await derive(password,salt,64,OPTIONS);return 'scrypt$32768$8$3$'+salt+'$'+hash.toString('hex')}
export async function verifyPassword(password,stored){try{if(stored?.startsWith('scrypt:')){const [kind,salt,hex]=stored.split(':');if(!/^[a-f0-9]{32}$/.test(salt)||!/^[a-f0-9]{128}$/.test(hex))return false;const actual=await derive(password,salt,64),expected=Buffer.from(hex,'hex');return timingSafeEqual(actual,expected)}const [kind,n,r,p,salt,hex]=(stored||'').split('$');if(kind!=='scrypt'||n!=='32768'||r!=='8'||p!=='3'||!/^[a-f0-9]{32}$/.test(salt)||!/^[a-f0-9]{128}$/.test(hex))return false;const actual=await derive(password,salt,64,OPTIONS);return timingSafeEqual(actual,Buffer.from(hex,'hex'))}catch{return false}}
export const dummyPassword=await hashPassword(randomBytes(32).toString('hex'));
const cookieName=secure=>secure?'__Host-hillplate_session':'hillplate_session';
export function sessionToken(req,secure=false){const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName(secure)+'='))?.slice(cookieName(secure).length+1);return token&&/^[a-f0-9]{64}$/.test(token)?token:null}
export function readUser(req,store,secure=false){const token=sessionToken(req,secure);if(!token)return null;const r=store.db.prepare('SELECT u.id,u.email,u.name FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token_hash=? AND s.expires>?').get(digest(token),Date.now());return r||null}
export function makeSession(userId,store,secure){const token=randomBytes(32).toString('hex');store.db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());store.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),userId,Date.now()+30*86400000);store.db.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash NOT IN (SELECT token_hash FROM sessions WHERE user_id=? ORDER BY expires DESC,rowid DESC LIMIT 10)').run(userId,userId);return cookieName(secure)+'='+token+'; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000'+(secure?'; Secure':'')}
export function destroySession(req,store,secure=false){const token=sessionToken(req,secure);if(token)store.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token))}
export const expiredCookie=secure=>cookieName(secure)+'=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'+(secure?'; Secure':'');
