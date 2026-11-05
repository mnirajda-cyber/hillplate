// The owner confirmed that 1021 uses a standing menu rather than a daily rotation.
export const standingLocations=new Set(['5877f02aee596f9b94e8911b']);
export function standingMenu(locationId,catalog,base={}){
 if(!standingLocations.has(locationId))return null;
 const items=catalog.filter(f=>f.locationId===locationId&&f.nutritionStatus==='verified'&&['calories','protein','carbs','fat'].every(k=>Number.isFinite(f[k])&&f[k]>=0));
 if(!items.length)return null;
 return {...base,source:'standing',standingMenu:true,unavailable:false,availabilityMessage:null,periods:[{id:'standing-menu',name:'Every day'}],selectedPeriodId:'standing-menu',items,foodCount:items.length,updatedAt:items.map(f=>f.lastSeenDate).sort().at(-1)||null,sourceUrl:'https://dineoncampus.com/razorbacks/locations/1021-food-hall'};
}
