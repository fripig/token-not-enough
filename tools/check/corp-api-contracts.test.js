// corp-api-contracts 的規則檢查：docs/spectra/specs/corp-api-contracts/spec.md
import {ok,section,newRun,clickMo} from './lib.js';
import {els,store,resetStore} from '../fake-dom.js';
import {CORP_DEFAULT,bestKey,normCorp} from '../../public/js/data.js';
import * as St from '../../public/js/state.js';
import {S,fresh,issueTitle} from '../../public/js/state.js';
import {start} from '../../public/js/main.js';
import {showEnd,showSetup} from '../../public/js/modals.js';
import {rulesTab} from '../../public/js/rules.js';
import * as C from '../../public/js/calc.js';

const J=JSON.stringify;

section("corp-api-contracts：不合法的值退回預設（normalization 範例）",()=>{
  ok(J(CORP_DEFAULT)===J(['anthropic','google']),'預設是 Anthropic＋Google',J(CORP_DEFAULT));
  const cases=[
    [['google','anthropic'],['anthropic','google']],
    [[],[]],
    [['openai','deepseek'],['anthropic','google']],
    [['openai','openai'],['anthropic','google']],
    [true,['anthropic','google']],
    [undefined,['anthropic','google']],
  ];
  for(const [v,want] of cases){
    ok(J(normCorp(v))===J(want),`normCorp(${J(v)}) → ${J(want)}`,J(normCorp(v)));
    newRun('laravel','parallel'); if(v===undefined) delete S.corpApi; else S.corpApi=v; fresh();
    ok(J(S.corpApi)===J(want),`跨局帶 ${J(v)} → 這局 ${J(want)}`,J(S.corpApi));
  }
  /* 回傳的是副本，改這局的清單不會改到預設 */
  newRun('laravel','parallel'); S.corpApi.push('openai');
  ok(J(CORP_DEFAULT)===J(['anthropic','google']),'改這局的清單不會改到 CORP_DEFAULT',J(CORP_DEFAULT));
  S.corpApi=[...CORP_DEFAULT];
});

section("corp-api-contracts：存檔帶著合約清單，舊存檔讀成預設（Contract list in saves）",()=>{
  newRun('laravel','parallel'); S.corpApi=['openai'];
  resetStore(); St.saveGame(null);
  const d=St.readSave();
  ok(d&&!d.bad,'存檔讀得到',J(d)?.slice(0,80));
  St.loadGame(d); ok(J(S.corpApi)===J(['openai']),'讀回 OpenAI',J(S.corpApi));
  const old=JSON.parse(store[St.SAVE_KEY]); delete old.S.corpApi;
  resetStore({[St.SAVE_KEY]:J(old)});
  const d2=St.readSave();
  ok(d2&&!d2.bad,'沒有 corpApi 的舊存檔可讀（SAVE_VER 沒加）',J(d2)?.slice(0,80));
  St.loadGame(d2); ok(J(S.corpApi)===J(['anthropic','google']),'舊存檔讀成 Anthropic＋Google',J(S.corpApi));
  ok(C.bills('anthropic').find(b=>b.id==='corp').ok&&C.bills('google').find(b=>b.id==='corp').ok&&!C.bills('openai').find(b=>b.id==='corp').ok,'舊存檔：Anthropic、Google 能走公司 API，OpenAI 不能');
  const bad=JSON.parse(store[St.SAVE_KEY]); bad.S.corpApi=null;
  St.loadGame(bad); ok(J(S.corpApi)===J(['anthropic','google']),'存檔裡的 corpApi 是 null 時讀成預設',J(S.corpApi));
  resetStore();
});

/* 開局紀錄的「遊戲模式」那行 */
const modeLine=()=>S.log.find(l=>l.msg.includes('遊戲模式'))?.msg||'';
/* 開局彈窗裡三顆按鈕各自的狀態：sel 表示有簽 */
const corpBtns=()=>Object.fromEntries([...els.mo.innerHTML.matchAll(/class="sb ?(sel)?" data-corp="(\w+)"><b>[^<]*<\/b><small>([^<]*)</g)].map(m=>[m[2],{on:!!m[1],small:m[3]}]));

section("corp-api-contracts：開局彈窗的公司 API 合約（Company API contract setting）",()=>{
  S.corpApi=undefined; start();
  const b=corpBtns();
  ok(Object.keys(b).join()==='anthropic,openai,google','三顆按鈕依序是 Anthropic、OpenAI、Google',Object.keys(b).join());
  ok(b.anthropic?.on&&b.google?.on&&!b.openai?.on,'第一局預選 Anthropic、Google',J(b));
  ok(b.anthropic?.small==='走部門預算'&&b.openai?.small==='公司沒簽約','小字：有簽寫走部門預算、沒簽寫公司沒簽約',J(b));
  ok(els.mo.innerHTML.includes('公司 API 合約')&&els.mo.innerHTML.includes('都不勾就是公司不出 AI 的錢'),'有標題與提示');
  const h=els.mo.innerHTML, iGig=h.indexOf('data-out="0"'), iCorp=h.indexOf('data-corp='), iAdv=h.indexOf('data-adv="0"');
  ok(iGig<iCorp&&iCorp<iAdv,'放在外包之後、進階模式之前',[iGig,iCorp,iAdv].join());
  const ids=S.issues.map(i=>i.id+issueTitle(i)).join();
  clickMo({corp:'google'}); clickMo({corp:'openai'});
  const b2=corpBtns(); ok(b2.anthropic.on&&b2.openai.on&&!b2.google.on,'點 Google 取消、點 OpenAI 勾選',J(b2));
  ok(S.issues.map(i=>i.id+issueTitle(i)).join()===ids,'切換合約不重抽第 1 天工單');
  ok(J(S.corpApi)===J(['anthropic','google']),'確認前不改這局的清單',J(S.corpApi));
  clickMo({act:'confirm'}); ok(J(S.corpApi)===J(['anthropic','openai']),'確認後是 Anthropic＋OpenAI',J(S.corpApi));
  S.day=20; showEnd(); clickMo({act:'again'});
  const b3=corpBtns(); ok(b3.anthropic.on&&b3.openai.on&&!b3.google.on,'再玩一個月預選 Anthropic、OpenAI',J(b3));
  showSetup(true); ok(!els.mo.innerHTML.includes('data-corp'),'週一調整不顯示公司 API 合約');
  S.corpApi=[...CORP_DEFAULT];
});

section("corp-api-contracts：一家都不勾也能開局（Empty list is allowed）",()=>{
  start(); clickMo({corp:'anthropic'}); clickMo({corp:'google'});
  const b=corpBtns(); ok(Object.values(b).every(x=>!x.on),'三顆都取消',J(b));
  clickMo({act:'confirm'});
  ok(J(S.corpApi)==='[]','確認後清單是空的',J(S.corpApi));
  ok(['anthropic','openai','google'].every(v=>!C.bills(v).find(x=>x.id==='corp').ok),'每家的公司 API 都不能用');
  ok(/・公司 API：無$/.test(modeLine()),'開局紀錄最後寫・公司 API：無',modeLine());
  ok(rulesTab('billing').includes('這局公司沒有簽任何廠商'),'規則付費分頁寫這局公司沒有簽任何廠商');
  S.corpApi=[...CORP_DEFAULT];
});

section("corp-api-contracts：規則與紀錄寫出簽約名單（Contract list in rules and log）",()=>{
  start(); clickMo({corp:'anthropic'}); clickMo({corp:'openai'}); clickMo({act:'confirm'});
  ok(/・公司 API：OpenAI、Google$/.test(modeLine()),'開局紀錄最後寫・公司 API：OpenAI、Google',modeLine());
  const line=rulesTab('billing').split('<li>').find(x=>x.includes('扣公司預算'))||'';
  ok(line.includes('OpenAI')&&line.includes('Google')&&!line.includes('Anthropic'),'規則付費分頁的公司 API 寫 OpenAI、Google，不寫 Anthropic',line.slice(0,120));
  S.corpApi=[...CORP_DEFAULT];
});

section("corp-api-contracts：只管公司 API，不影響席位與最高分（Contract list scope）",()=>{
  newRun('laravel','parallel'); S.corpApi=[]; S.day=6; S.seats=[]; S.seatReq=null;
  showSetup(true);
  const seats=[...els.mo.innerHTML.matchAll(/data-seat="(\w*)"/g)].map(m=>m[1]).filter(Boolean);
  ok(seats.join()==='anthropic,openai,google','一家都沒簽時週一仍可申請三家席位',seats.join());
  S.corpApi=['openai']; const k1=bestKey(); S.corpApi=[...CORP_DEFAULT]; const k2=bestKey();
  ok(k1===k2&&k1==='tokgame-best-parallel-laravel','只簽 OpenAI 與預設合約的最高分 key 相同',`${k1} / ${k2}`);
});
