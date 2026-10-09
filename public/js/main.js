import {S,addGigs,fresh,makeIssue,resetIds,sel} from './state.js';
import {log} from './calc.js';
import {batch,dispatch,endDay,evaluate,invest,loadPreset,manual,quick,rescope,savePreset,wait} from './actions.js';
import {app,render} from './view.js';
import {showSetup} from './modals.js';

/* ===== 事件 ===== */
app.addEventListener('click',e=>{
  const t=e.target.closest('button'); if(!t||t.disabled) return;
  if(t.dataset.iss){sel.issue=+t.dataset.iss;render();}
  else if(t.dataset.v){sel.v=t.dataset.v;sel.m=t.dataset.m;if(sel.v==='local')sel.b='local';else if(sel.b==='local')sel.b='api';render();}
  else if(t.dataset.b){sel.b=t.dataset.b;render();}
  else if(t.dataset.rv){sel.rv=+t.dataset.rv;render();}
  else if(t.dataset.quick)quick(+t.dataset.quick);
  else if(t.dataset.inv){invest(t.dataset.inv,t.dataset.st);render();}
  else if(t.dataset.act==='batch'){batch();render();}
  else if(t.dataset.load){loadPreset(+t.dataset.load);render();}
  else if(t.dataset.save){savePreset(+t.dataset.save);render();}
  else if(t.dataset.act==='go')dispatch();
  else if(t.dataset.act==='manual')manual();
  else if(t.dataset.act==='eval')evaluate();
  else if(t.dataset.act==='rescope')rescope();
  else if(t.dataset.act==='end')endDay();
  else if(t.dataset.act==='wait1')wait(false);
  else if(t.dataset.act==='waitn')wait(true);
  else if(t.dataset.act==='adjust')showSetup(true);
});

/* 第 1 天的工單依公司產生；開局換公司時重抽 */
export function firstIssues(){
  resetIds(); S.issues=[]; S.log=[];
  for(let i=0;i<4;i++)S.issues.push(makeIssue(false));
  const g=addGigs();
  log('dim',`— 第 1 天開工，新進 4 張工單${g?`，外包 ${g} 張`:''} —`);
}
export function start(){
  fresh(); firstIssues();
  render(); showSetup(false);
}
start();
