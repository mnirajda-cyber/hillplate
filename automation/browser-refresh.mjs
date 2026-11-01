import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.dirname(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/,'$1')));
const snapshotPath=path.join(root,'app/data/menu-snapshot.json');
export const location={id:'5872971fee596f00db1bf743',name:'Fulbright Dining Hall'};
export const localDate=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
export async function readRows(tab){
 const rows=await tab.playwright.evaluate(()=>Array.from(document.querySelectorAll('#menu-content tr')).filter(r=>r.querySelector('button.menu-item-name')).map((r,i)=>{const cells=r.querySelectorAll('td'),b=r.querySelector('button.menu-item-name'),label=b.getAttribute('aria-label');const same=Array.from(document.querySelectorAll('#menu-content button.menu-item-name')).filter(x=>x.getAttribute('aria-label')===label);const raw=cells[2]?.textContent.trim();const preceding=Array.from(document.querySelectorAll('#menu-content [role="button"][aria-label^="Toggle "]')).filter(toggle=>Array.from(document.querySelectorAll('#menu-content tr,#menu-content [role="button"][aria-label^="Toggle "]')).indexOf(toggle)<Array.from(document.querySelectorAll('#menu-content tr,#menu-content [role="button"][aria-label^="Toggle "]')).indexOf(r));const heading=preceding[preceding.length-1];const station=heading?heading.getAttribute('aria-label').replace(/^Toggle /,'').replace(/ category$/,''):'Published menu';return {providerId:'published-'+i,name:label.replace('View nutritional information for ','').trim(),serving:cells[1]?.textContent.trim()||'1 serving',calories:raw!==''&&Number.isFinite(Number(raw))?Number(raw):null,protein:null,carbs:null,fat:null,nutritionStatus:'pending',station,_label:label,_occurrence:same.indexOf(b)}}));
 const distinct=rows.filter((r,i,a)=>a.findIndex(x=>x.name===r.name&&x.serving===r.serving&&x.calories===r.calories)===i);
 const unique=rows.filter((r,i,a)=>a.findIndex(x=>x.name===r.name&&x.serving===r.serving&&x.calories===r.calories&&x.station===r.station)===i);
 if(rows.length>20&&distinct.length/rows.length<0.4)throw Error('Menu has suspicious repetition across stations; refusing incomplete source');
 return unique;
}
export async function verifyRows(tab,rows){const now=await readRows(tab);const signature=list=>JSON.stringify(list.map(r=>[r.name,r.serving,r.calories,r.station]));if(signature(now)!==signature(rows))throw Error('Menu changed during collection; refresh this meal before saving');return now.length}
export async function readNutrition(tab,food){
 await tab.playwright.getByRole('button',{name:food._label,exact:true}).nth(food._occurrence).click({force:true});
 await tab.playwright.locator('#nutrition-modal-title').waitFor({state:'visible',timeoutMs:15000});
 const result=await tab.playwright.evaluate(()=>{const h=document.getElementById('nutrition-modal-title'),t=h.parentElement.innerText;function num(label){const clean=label.replace(' (g)','');const pattern=new RegExp('(?:^|\\n)'+clean+'(?: \\(g\\))?\\s+(\\d+(?:\\.\\d+)?)');const m=t.match(pattern);return m?Number(m[1]):null}return {name:h.textContent.trim(),protein:num('Protein (g)'),carbs:num('Total Carbohydrates (g)'),fat:num('Total Fat (g)')}});
 await tab.playwright.getByRole('button',{name:'Close nutrition information modal',exact:true}).first().click();
 if(result.name.toLowerCase()!==food.name.toLowerCase())throw Error('Nutrition popup does not match '+food.name);
 return {protein:result.protein,carbs:result.carbs,fat:result.fat,nutritionStatus:'verified'};
}
export async function enrich(tab,rows,start=0,end=rows.length,cache=new Map()){
 for(let i=start;i<Math.min(end,rows.length);i++){const r=rows[i],key=r.name+'|'+r.serving+'|'+r.calories;if(cache.has(key))Object.assign(r,cache.get(key));else{const nutrients=await readNutrition(tab,r);Object.assign(r,nutrients);cache.set(key,nutrients)}r.nutritionStatus='verified'}
 return {completed:Math.min(end,rows.length),total:rows.length};
}
export async function readPeriods(tab){
 await tab.playwright.getByRole('button',{name:/^Menu /}).click();
 await tab.playwright.locator('[data-period-id]').first().waitFor({state:'visible',timeoutMs:15000});
 const periods=await tab.playwright.evaluate(()=>Array.from(document.querySelectorAll('[data-period-id]')).map(e=>({id:e.getAttribute('data-period-id'),name:e.textContent.trim()})));
 await tab.playwright.getByRole('button',{name:/^Menu /}).click();return periods;
}
export async function selectPeriod(tab,p){
 const expected=new URL(await tab.url());expected.pathname=expected.pathname.replace(/[^/]+$/,p.name.trim().toLowerCase().replace(/\s+/g,'-'));
 await tab.playwright.getByRole('button',{name:/^Menu /}).click();await tab.playwright.getByRole('option',{name:p.name,exact:true}).click();
 await tab.playwright.waitForURL(expected.href,{waitUntil:'domcontentloaded',timeoutMs:30000});
 await tab.playwright.domSnapshot();
 await tab.playwright.getByRole('button',{name:'Menu '+p.name,exact:true}).waitFor({state:'visible',timeoutMs:30000});
 await tab.reload();
 await tab.playwright.locator('#menu-content').waitFor({state:'visible',timeoutMs:30000});
 await tab.playwright.getByRole('status',{name:'Loading menu content'}).waitFor({state:'hidden',timeoutMs:30000});
 await tab.playwright.getByRole('button',{name:'Menu '+p.name,exact:true}).waitFor({state:'visible',timeoutMs:30000});
 const collapsed=await tab.playwright.evaluate(()=>Array.from(document.querySelectorAll('#menu-content [role="button"][aria-expanded="false"][aria-label^="Toggle "]')).map(b=>b.getAttribute('aria-label')));
 for(const label of collapsed)await tab.playwright.getByRole('button',{name:label,exact:true}).click();
 await tab.playwright.domSnapshot();
}
export async function saveDay(menu,options={}){
 const target=options.snapshotPath||snapshotPath;
 const statusTarget=options.statusPath||path.join(root,'app/data/refresh-status.json');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(menu.date)||!menu.location?.id||!menu.location?.name||!(menu.location.slug||menu.location.id===location.id)||(!menu.periods.length&&!menu.unavailable))throw Error('Invalid dated menu');
 if(!Array.isArray(menu.expectedPeriods)||JSON.stringify([...menu.expectedPeriods].sort())!==JSON.stringify(menu.periods.map(p=>p.name).sort()))throw Error('Not all source meal periods were captured');
 if(menu.unavailable&&(menu.periods.length||menu.sourceUrl!=='https://dineoncampus.com/razorbacks/locations/'+menu.location.slug))throw Error('Unverified unavailable location');
 for(const p of menu.periods){const expectedUrl='https://dineoncampus.com/razorbacks/whats-on-the-menu/'+(menu.location.slug||'fulbright-dining-hall')+'/'+menu.date+'/'+p.name.trim().toLowerCase().replace(/\s+/g,'-');if(p.verifiedSource?.url!==expectedUrl)throw Error('Source URL does not match the captured date and meal');if(!p.verifiedSource||p.verifiedSource.date!==menu.date||p.verifiedSource.meal!==p.name||p.verifiedSource.foodCount!==p.items.length)throw Error('Missing matching source completeness check for '+p.name)}
 for(const p of menu.periods)for(const r of p.items){if(r.nutritionStatus==='pending'||!r.name||r.protein===undefined||r.carbs===undefined||r.fat===undefined)throw Error('Incomplete food review');delete r._label;delete r._occurrence}
 const previous=JSON.parse(await fs.readFile(target,'utf8'));const capturedAt=new Date().toISOString();menu.updatedAt=capturedAt;
 const menus=previous.menus.filter(m=>!(m.date===menu.date&&m.location.id===menu.location.id));menus.push(menu);menus.sort((a,b)=>a.date.localeCompare(b.date));
 const temp=target+'.tmp';await fs.writeFile(temp,JSON.stringify({capturedAt,menus}));await fs.rename(temp,target);
 const priorStatus=JSON.parse(await fs.readFile(statusTarget,'utf8').catch(()=>'{}'));
 await fs.writeFile(statusTarget,JSON.stringify({...priorStatus,enabled:true,time:'06:00',timezone:'America/Chicago',localOnly:true,lastRunAt:capturedAt,lastError:null}));
 return {date:menu.date,periods:menu.periods.map(p=>({name:p.name,foods:p.items.length})),capturedAt};
}

