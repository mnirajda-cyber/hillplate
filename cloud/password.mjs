import {scrypt,randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt),options={N:32768,r:8,p:3,maxmem:64*1024*1024};
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const randomToken=()=>randomBytes(32).toString('hex');
export const sameSecret=(a,b)=>typeof a==='string'&&typeof b==='string'&&timingSafeEqual(Buffer.from(digest(a),'hex'),Buffer.from(digest(b),'hex'));
export async function hashPassword(password){const salt=randomBytes(16).toString('hex');return 'scrypt$32768$8$3$'+salt+'$'+(await derive(password,salt,64,options)).toString('hex')}
export async function verifyPassword(password,stored){const [kind,n,r,p,salt,hex]=(stored||'').split('$');if(kind!=='scrypt'||n!=='32768'||r!=='8'||p!=='3'||!/^[a-f0-9]{32}$/.test(salt)||!/^[a-f0-9]{128}$/.test(hex))return false;return timingSafeEqual(await derive(password,salt,64,options),Buffer.from(hex,'hex'))}
