import {openStore} from './storage.mjs';
import {refreshMenus} from './refresh.mjs';
import {resolve} from 'node:path';
const store=openStore(process.env.DATA_DIR||resolve('.hillplate-data'));
try{console.log(await refreshMenus(store))}catch(e){console.error(e.message);process.exitCode=1}finally{store.close()}
