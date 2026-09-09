// Exercises production dwell invitations through user input and elapsed browser time.
// No development hooks or application state overrides are used.
import assert from 'node:assert/strict';
import { launchBrowser, qaOutput } from './qa-runtime.mjs';
const base=process.argv[2];
if(!base) throw Error('Supply the temporary deployment URL');
const browser=await launchBrowser();
const out=qaOutput('production-games');
const seen=[];
let checks=0;
function check(value,message){assert.ok(value,message);checks++;console.log('PASS: '+message);}
try {
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 for(let i=0;i<5;i++){
  const page=await ctx.newPage();
  await page.clock.install();
  await page.goto(base+'/services',{waitUntil:'load'});
  await page.getByTestId('pip-hide').waitFor();
  await page.touchscreen.tap(100,300);
  await page.clock.fastForward(16000);
  await page.clock.fastForward(63000);
  await page.getByTestId('game-accept').waitFor({timeout:10000});
  check(await page.getByTestId('game').count()===0,'game waits for consent '+i);
  await page.getByTestId('game-accept').tap();
  const game=page.getByTestId('game'); await game.waitFor();
  const id=await game.getAttribute('data-game');
  check(!seen.includes(id),'game rotation offers '+id);seen.push(id);
  if(id==='glitch'){
   await page.locator('[data-glitch=true]').tap();
   await page.clock.fastForward(400);
   check(/Round 2/.test(await game.textContent()),'glitch touch advances round');
  }else if(id==='spark'){
   const grid=page.locator('[data-testid=spark-board] [role=grid]');
   await grid.focus();await page.keyboard.press('Enter');
   await page.clock.fastForward(400);
   check(/1 turns/.test(await game.textContent()),'spark keyboard rotates tile');
  }else if(id==='hotforge'){
   await page.clock.fastForward(1500);
   const cell=page.locator('[data-testid=hotforge-grid] button').first();await cell.tap();
   check(Number(await cell.getAttribute('data-heat'))<0.1,'hot forge touch cools cell');
  }else if(id==='recall'){
   await page.clock.fastForward(2500);
   await page.locator('[data-testid=recall-grid][data-phase=recall]').waitFor();
   check(await page.locator('[data-lit=true]').count()===0,'recall hides its pattern');
  }else{
   await page.keyboard.press('ArrowRight');
   check(await game.isVisible(),'forge accepts keyboard input');
  }
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no mobile overflow in '+id);
  check(await page.locator('audio').count()===0,'no audio playback in '+id);
  await page.emulateMedia({reducedMotion:'reduce'});
  check(await game.isVisible(),'reduced motion keeps '+id+' usable');
  await page.screenshot({path:out+'/'+id+'.png'});
  await page.keyboard.press('Escape');await game.waitFor({state:'detached'});
  check(await game.count()===0,'Escape exits '+id);
  await page.close();
 }
 check(seen.length===5 && new Set(seen).size===5,'all five distinct games offered');
 console.log(`PASS: ${checks} production game checks`);
}finally{await browser.close();}
