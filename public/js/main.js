import {S,addGigs,clearSave,fresh,makeIssue,readSave,resetIds,sel} from './state.js';
import {log,prefBill} from './calc.js';
import {batch,cancelJob,dispatch,endDay,evaluate,research,invest,loadPreset,manual,quick,requestHw,rescope,savePreset,wait,registerConf,dayStartLine} from './actions.js';
import {app,armCancel,cancelArm,render,setTab} from './view.js';
import {showBadSave,showResume,showSetup} from './modals.js';
import {showRules} from './rules.js';
import {initLang,setLang} from './i18n.js';

/* ===== 事件 ===== */
app.addEventListener('click',e=>{
  const t=e.target.closest('button');
  /* 中止待確認時，點其他地方（含非按鈕）就恢復 */
  if(cancelArm!==null&&!(t&&+t.dataset.cancel===cancelArm)){armCancel(null);render();}
  if(!t||t.disabled) return;
  if(t.dataset.cancel){const id=+t.dataset.cancel; if(cancelArm===id){armCancel(null);cancelJob(id);}else armCancel(id); render();}
  else if(t.dataset.iss){sel.issue=+t.dataset.iss;setTab('dispatch');render();}
  else if(t.dataset.tab){setTab(t.dataset.tab);render();}
  else if(t.dataset.v){const nv=t.dataset.v!==sel.v;sel.v=t.dataset.v;sel.m=t.dataset.m;if(sel.v==='local')sel.b='local';else{if(sel.b==='local')sel.b='api';if(nv)sel.b=prefBill(sel.v,S.issues.find(i=>i.id===sel.issue),sel.m)??sel.b;}render();}
  else if(t.dataset.b){sel.b=t.dataset.b;render();}
  else if(t.dataset.rv){sel.rv=+t.dataset.rv;render();}
  else if(t.dataset.ef){sel.ef=+t.dataset.ef;render();}
  else if(t.dataset.sdd){sel.sdd=+t.dataset.sdd;render();}
  else if(t.dataset.quick)quick(+t.dataset.quick,'quick',+t.dataset.p);
  else if(t.dataset.inv){invest(t.dataset.inv,t.dataset.st);render();}
  else if(t.dataset.hw){requestHw(t.dataset.hw);render();}
  else if(t.dataset.conf){registerConf(t.dataset.conf);render();}
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
  else if(t.dataset.lang){setLang(t.dataset.lang);render();}
});

/* 第 1 天的工單依公司產生；開局換公司時重抽 */
export function firstIssues(){
  resetIds(); S.issues=[]; S.log=[];
  for(let i=0;i<4;i++)S.issues.push(makeIssue(false));
  const g=addGigs();
  log('dim',dayStartLine(1,false,4,g));
}
export function start(){
  clearSave(); fresh(); firstIssues(); setTab('dispatch');
  render(); showSetup(false);
}
/* 開頁：先決定語言；有存檔問要不要繼續，存檔壞了先提示，都沒有就開新局 */
export function boot(){
  initLang();
  const d=readSave();
  if(!d) start(); else if(d.bad) showBadSave(); else showResume(d);
}
boot();
