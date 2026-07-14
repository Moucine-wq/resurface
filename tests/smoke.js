'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const port = 39000 + Math.floor(Math.random() * 1000);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'resurface-v3-2-'));
const child = spawn(process.execPath, ['server.js'], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, PORT:String(port), DB_PATH:path.join(temp,'test.db') },
  stdio: ['ignore','pipe','pipe'],
});
let stderr = '';
child.stderr.on('data', chunk => { stderr += chunk; });

async function waitForServer() {
  for (let i=0;i<50;i++) {
    try { const r=await fetch(`http://127.0.0.1:${port}/api/health`); if(r.ok)return; } catch {}
    await new Promise(r=>setTimeout(r,100));
  }
  throw new Error('Server did not start. '+stderr);
}
async function api(pathname, options={}) {
  const response=await fetch(`http://127.0.0.1:${port}/api${pathname}`,options);
  const data=await response.json();
  if(!response.ok) throw new Error(`${response.status}: ${JSON.stringify(data)}`);
  return data;
}
(async()=>{
  try {
    await waitForServer();
    const health=await api('/health');
    if(health.version!=='3.2.0') throw new Error('Wrong version');
    const config=await api('/config');
    if(config.paymentsEnabled!==false || !config.supportedCurrencies.includes('XOF')) throw new Error('Currency config missing');

    const email=`test-${Date.now()}@example.com`;
    const signup=await api('/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      email,password:'password123',locale:'fr',timezone:'America/New_York',country:'US',currency:'USD'
    })});
    const auth={Authorization:`Bearer ${signup.token}`,'Content-Type':'application/json'};
    const me=await api('/me',{headers:auth});
    if(me.timezone!=='America/New_York'||me.country!=='US'||me.currency!=='USD')throw new Error('Settings not saved');

    const patched=await api('/me',{method:'PATCH',headers:auth,body:JSON.stringify({digestTime:'07:30',digestEnabled:true,country:'BJ',currency:'XOF'})});
    if(patched.currency!=='XOF'||patched.country!=='BJ')throw new Error('Currency update failed');

    await api('/items',{method:'POST',headers:auth,body:JSON.stringify({
      text:'Call the client',resurfaceDate:'2030-05-10',resurfaceTime:'14:30',timezone:'America/New_York',
      category:'followup',recurrenceType:'weekdays',recurrenceInterval:1
    })});
    const items=await api('/items',{headers:auth});
    if(items.upcoming.length!==1)throw new Error('Item not classified as upcoming');
    if(items.upcoming[0].resurfaceTime!=='14:30')throw new Error('Timezone conversion failed');
    if(items.upcoming[0].category!=='followup'||items.upcoming[0].recurrenceType!=='weekdays')throw new Error('Detailed options not saved');

    await api(`/items/${items.upcoming[0].id}`,{method:'PATCH',headers:auth,body:JSON.stringify({
      action:'update',text:'Call the client again',resurfaceDate:'2030-05-11',resurfaceTime:'15:45',timezone:'America/New_York',
      category:'subscription',recurrenceType:'custom_days',recurrenceInterval:10
    })});
    const updated=await api('/items',{headers:auth});
    if(updated.upcoming[0].text!=='Call the client again'||updated.upcoming[0].resurfaceTime!=='15:45')throw new Error('Update failed');
    if(updated.upcoming[0].category!=='subscription'||updated.upcoming[0].recurrenceType!=='custom_days'||updated.upcoming[0].recurrenceInterval!==10)throw new Error('Custom recurrence update failed');

    await api(`/items/${updated.upcoming[0].id}`,{method:'PATCH',headers:auth,body:JSON.stringify({action:'done',timezone:'America/New_York'})});
    const afterDone=await api('/items',{headers:auth});
    if(afterDone.done.length!==1||afterDone.upcoming.length!==1)throw new Error('Recurring next occurrence was not created');
    if(afterDone.upcoming[0].resurfaceDate!=='2030-05-21')throw new Error(`Wrong recurring date: ${afterDone.upcoming[0].resurfaceDate}`);

    console.log('Smoke tests passed');
  } finally {
    child.kill('SIGTERM');
    fs.rmSync(temp,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
