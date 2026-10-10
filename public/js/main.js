import {S,addGigs,clearSave,fresh,makeIssue,readSave,resetIds,sel} from './state.js';
import {log} from './calc.js';
import {batch,dispatch,endDay,evaluate,research,invest,loadPreset,manual,quick,requestHw,rescope,savePreset,wait} from './actions.js';
import {app,render} from './view.js';
import {showBadSave,showResume,showSetup} from './modals.js';
import {showRules} from './rules.js';

/* ===== 事件 ===== */
app.addEventListener('click',e=>{
  const t=e.target.closest('button'); if(!t||t.disabled) return;
  if(t.dataset.iss){sel.issue=+t.dataset.iss;render();}
  else if(t.dataset.v){sel.v=t.dataset.v;sel.m=t.dataset.m;if(sel.v==='local')sel.b='local';else if(sel.b==='local')sel.b='api';render();}
  else if(t.dataset.b){sel.b=t.dataset.b;render();}
  else if(t.dataset.rv){sel.rv=+t.dataset.rv;render();}
  else if(t.dataset.ef){sel.ef=+t.dataset.ef;render();}
  else if(t.dataset.quick)quick(+t.dataset.quick);
  else if(t.dataset.inv){invest(t.dataset.inv,t.dataset.st);render();}
  else if(t.dataset.hw){requestHw(t.dataset.hw);render();}
  else if(t.dataset.act==='batch'){batch();render();}
  else if(t.dataset.load){loadPreset(+t.dataset.load);render();}
  else if(t.dataset.save){savePreset(+t.dataset.save);render();}
  else if(t.dataset.act==='go')dispatch();
  else if(t.dataset.act==='manual')manual();
  else if(t.dataset.act==='eval')evaluate();
  else if(t.dataset.act==='research')research('agent');
  else if(t.dataset.act==='selfresearch')research('self');
  else if(t.dataset.act==='rescope')rescope();
  else if(t.dataset.act==='end')endDay();
  else if(t.dataset.act==='wait1')wait(false);
  else if(t.dataset.act==='waitn')wait(true);
  else if(t.dataset.act==='adjust')showSetup(true);
  else if(t.dataset.act==='rules')showRules();
});

/* 第 1 天的工單依公司產生；開局換公司時重抽 */
export function firstIssues(){
  resetIds(); S.issues=[]; S.log=[];
  for(let i=0;i<4;i++)S.issues.push(makeIssue(false));
  const g=addGigs();
  log('dim',`— 第 1 天開工，新進 4 張工單${g?`，外包 ${g} 張`:''} —`);
}
export function start(){
  clearSave(); fresh(); firstIssues();
  render(); showSetup(false);
}
/* 開頁：有存檔問要不要繼續，存檔壞了先提示，都沒有就開新局 */
export function boot(){
  const d=readSave();
  if(!d) start(); else if(d.bad) showBadSave(); else showResume(d);
}
boot();
