import { isAdmin, json } from './_shared.mjs';
export default async request => json({success:isAdmin(request)});
