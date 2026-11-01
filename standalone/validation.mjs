import {z} from 'zod';
const n=z.number().finite().min(0).max(100000);
export const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s);
export const targets=z.object({calories:n.min(1),protein:n.min(1),carbs:n.min(1),fat:n.min(1)});
export const food=z.object({date:day,name:z.string().trim().min(1).max(200),meal:z.enum(['Breakfast','Lunch','Dinner','Snack']),location:z.string().max(150),serving:z.string().max(100),quantity:z.number().finite().gt(0).max(100),calories:n,protein:n,carbs:n,fat:n});
export const credentials=z.object({email:z.string().trim().toLowerCase().email().max(254),password:z.string().min(12).max(128),name:z.string().trim().min(1).max(80).optional(),importLegacy:z.boolean().optional(),setupKey:z.string().max(256).optional()});
export const backup=z.object({version:z.literal(1),entries:z.array(food).max(10000),goals:targets.nullable()});
