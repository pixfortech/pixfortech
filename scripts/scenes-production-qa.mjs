import assert from 'node:assert/strict';
import {launchBrowser,qaOutput} from './qa-runtime.mjs';
const base=process.argv[2];if(!base)throw Error('Temporary URL required');
const browser=await launchBrowser();const out=qaOutput('scenes');
try{
 const p=await browser.newPage({viewport:{width:1280,height:850},reducedMotion:'reduce'});
 const routes=['/','/work','/services','/about','/process','/technologies','/careers','/contact','/insights','/people'];
 const scenes=[];
 for(const route of routes){
  await p.goto(base+route,{waitUntil:'load'});
  const scene=p.getByTestId('pip-scene').first();await scene.waitFor();
  const kind=await scene.getAttribute('data-kind');assert.ok(!scenes.includes(kind),'Distinct scene for '+route);scenes.push(kind);
  await scene.scrollIntoViewIfNeeded();await scene.screenshot({path:out+'/'+kind+'.png'});
  console.log('PASS: '+route+' has '+kind+' scene');
 }
 await p.goto(base+'/people');const profile=await p.locator('a[href^="/people/"]').first().getAttribute('href');assert.ok(profile);await p.goto(base+profile);
 assert.ok(await p.locator('h1').textContent());console.log('PASS: public staff profile renders');
 await p.goto(base+'/qa-not-found');assert.ok((await p.locator('h1').textContent()).includes('misplaced'));
 await p.getByTestId('game').waitFor();await p.screenshot({path:out+'/not-found.png'});
 console.log('PASS: unique interactive lost-pixels 404 scene');
 console.log('PASS: 10 distinct PiP scenes, interactive 404 and public staff page');
}finally{await browser.close();}
