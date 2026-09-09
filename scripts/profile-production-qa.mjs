import assert from 'node:assert/strict';
import {launchBrowser,qaPassword} from './qa-runtime.mjs';
const base=process.argv[2];if(!base)throw Error('Temporary QA URL required');
const browser=await launchBrowser();let count=0;
const check=(value,name)=>{assert.ok(value,name);count++;console.log('PASS: '+name);};
async function login(email){const ctx=await browser.newContext();const page=await ctx.newPage();page.setDefaultTimeout(60000);await page.goto(base+'/login');await page.getByLabel('Email').fill(email);await page.getByLabel('Password',{exact:true}).fill(qaPassword());await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(/\/(admin|portal)/);return{ctx,page};}
try{
 const staff=await login('pm@pixelforge.test');const p=staff.page;await p.goto(base+'/admin/profile');
 const fields={'Display name':'QA Project Manager','Job title':'QA Delivery Lead','Timezone':'Asia/Kolkata','Short bio':'Temporary profile privacy QA.','LinkedIn':'https://linkedin.com/in/qa-example','GitHub':'https://github.com/qa-example','Website':'https://example.com/'};
 for(const [label,value]of Object.entries(fields))await p.getByLabel(label).fill(value);
 await p.getByRole('button',{name:'Save profile',exact:true}).click();await p.getByText('Profile saved',{exact:true}).waitFor();
 await p.reload();for(const [label,value]of Object.entries(fields))check(await p.getByLabel(label).inputValue()===value,label+' persists');
 const username='pm_qa_'+Date.now().toString(36);await p.getByTestId('username-input').fill(username);await p.locator('#pr-username-status').getByText(/^Available\./).waitFor();await p.getByTestId('save-username').click();await p.getByText('Username updated',{exact:true}).waitFor();
 const before=(await(await staff.ctx.request.get(base+'/api/auth/get-session')).json()).user.role;check(before==='project_manager','profile edits preserve role');
 const slug=await p.getByTestId('slug-input').inputValue();check(Boolean(slug),'staff has public slug');
 await p.getByTestId('publish-toggle').check();await p.getByText('Profile published',{exact:true}).waitFor();await p.getByRole('link',{name:'View page',exact:true}).waitFor();
 const anon=await browser.newContext();const publicPage=await anon.newPage();await publicPage.goto(base+'/people/'+slug);
 check(await publicPage.locator('link[rel=canonical]').getAttribute('href')===base+'/people/'+slug,'canonical uses temporary hostname');
 check((await publicPage.locator('meta[name=description]').getAttribute('content')).includes(fields['Short bio']),'profile metadata uses bio');
 check((await(await anon.request.get(base+'/sitemap.xml')).text()).includes('/people/'+slug),'published profile in sitemap');
 await p.getByTestId('publish-toggle').uncheck();await p.getByText('Profile hidden',{exact:true}).waitFor();await p.getByRole('link',{name:'Preview',exact:true}).waitFor();
 check((await anon.request.get(base+'/people/'+slug)).status()===404,'unpublished profile inaccessible anonymously');
 check(!(await(await anon.request.get(base+'/sitemap.xml')).text()).includes('/people/'+slug),'unpublished profile removed from sitemap');
 await p.getByRole('link',{name:'Preview',exact:true}).getAttribute('href');
 const preview=await staff.ctx.newPage();await preview.goto(base+'/people/'+slug+'?preview=1');check((await preview.locator('meta[name=robots]').getAttribute('content')).includes('noindex'),'owner preview is noindex');
 const client=await login('daniel@meridian.test');await client.page.goto(base+'/portal/profile');
 check(await client.page.getByTestId('publish-toggle').count()===0,'client cannot publish staff profile');
 await client.page.getByTestId('username-input').fill(username);await client.page.locator('#pr-username-status').getByText(/already forged/i).waitFor();check(await client.page.getByTestId('save-username').isDisabled(),'duplicate username rejected');
 await client.page.getByTestId('username-input').fill('bad username!');check(await client.page.getByTestId('save-username').isDisabled(),'invalid username rejected');
 const role=(await(await client.ctx.request.get(base+'/api/auth/get-session')).json()).user.role;check(role.startsWith('client_'),'username does not change client permissions');
 const a=await login('maya@northbank.test');await client.page.goto(base+'/portal/projects');const foreign=await client.page.locator('a[href^="/portal/projects/"]').first().getAttribute('href');
 for(const suffix of ['', '/messages','/approvals'])check((await a.ctx.request.get(base+foreign+suffix)).status()===404,'cross-tenant '+(suffix||'project')+' denied');
 for(const path of ['/api/admin/bootstrap','/admin/bootstrap'])check([401,403,404].includes((await anon.request.get(base+path,{maxRedirects:0})).status())||path==='/admin/bootstrap'&&(await anon.request.get(base+path,{maxRedirects:0})).status()===307,'bootstrap unavailable at '+path);
 console.log(`PASS: ${count} profile/privacy/security checks`);
}catch(e){console.error('FAILED:',String(e.message).replace(/https?:\/\/\S+/g,'[URL]'));process.exitCode=1;}finally{await browser.close();}
