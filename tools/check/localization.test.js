// localization 的規則檢查：docs/spectra/specs/localization/spec.md
import {ok,section,stripComments,newRun} from './lib.js';
import {readFileSync,readdirSync} from 'node:fs';
import {els,store,resetStore} from '../fake-dom.js';
import {seedRandom} from '../seed.js';
import {boot,firstIssues,start} from '../../public/js/main.js';
import {STACKS,VENDORS} from '../../public/js/data.js';
import * as dataModule from '../../public/js/data.js';
import {S,makeIssue,sel} from '../../public/js/state.js';
import {EVENTS,dispatch,endDay,evaluate,invest,manual} from '../../public/js/actions.js';
import {render} from '../../public/js/view.js';
import {showSetup} from '../../public/js/modals.js';
import * as A from '../../public/js/actions.js';
import * as C from '../../public/js/calc.js';
import * as M from '../../public/js/modals.js';
import * as St from '../../public/js/state.js';
import * as Ru from '../../public/js/rules.js';
import * as I from '../../public/js/i18n.js';
/* 字典檔以外的遊戲模組：註解以外不能有中文（gh-34-01-i18n） */
const I18N_DONE=readdirSync(new URL('../../public/js/',import.meta.url)).filter(f=>f.endsWith('.js'));

section("多語系（gh-34-01-i18n）",()=>{
  /* 多語系（gh-34-01-i18n） */
  {
   ok(I.LANGS.map(l=>l.id).join()==='zh-TW,en'&&I.LANGS.map(l=>l.dict['lang.name']).join()==='繁體中文,English','i18n：註冊 zh-TW（繁體中文）與 en（English），順序固定');
   ok(I.lang==='zh-TW','i18n：node 工具載入後是 zh-TW（fake-dom 固定 navigator）',I.lang);
   const pk=[[null,['zh-TW'],'zh-TW'],[null,['zh-CN','en'],'zh-TW'],[null,['en-US'],'en'],[null,['ja-JP'],'en'],[null,['ja-JP','zh-TW'],'zh-TW'],['en',['zh-TW'],'en'],['xx',['zh-TW'],'zh-TW']];
   for(const [st,list,want] of pk) ok(I.pickLang(st,list)===want,`i18n：pickLang(${st}, ${list}) → ${want}`,I.pickLang(st,list));
   /* initLang 讀 localStorage 與 navigator；測完還原成 zh-TW */
   const nav=globalThis.navigator;
   globalThis.navigator={language:'en-US',languages:['en-US']}; resetStore(); I.initLang();
   ok(I.lang==='en','i18n：沒有偏好、瀏覽器 en-US → en',I.lang);
   resetStore({[I.LANG_KEY]:'en'}); globalThis.navigator={language:'zh-TW',languages:['zh-TW']}; I.initLang();
   ok(I.lang==='en','i18n：存的偏好 en 勝過瀏覽器 zh-TW',I.lang);
   resetStore({[I.LANG_KEY]:'xx'}); I.initLang();
   ok(I.lang==='zh-TW','i18n：不認得的偏好被忽略',I.lang);
   ok(globalThis.document.documentElement.lang==='zh-TW'&&globalThis.document.title===I.LANGS[0].dict['page.title'],'i18n：applyLang 設定 <html lang> 與分頁標題');
   globalThis.navigator=nav; resetStore(); I.initLang();
   /* 查字典：測試用 key 只加在載入的物件上，測完刪掉 */
   const zh=I.LANGS[0].dict, en=I.LANGS[1].dict;
   zh['test.rules']='規則'; en['test.rules']='Rules'; zh['test.day']='— 第 {d} 天開工 —'; en['test.day']='— Day {d} starts —'; zh['test.only']='只有中文';
   const look=id=>{I.setLang(id);};
   look('zh-TW'); ok(I.t('test.rules')==='規則','i18n：zh-TW t(test.rules) → 規則');
   look('en'); ok(I.t('test.rules')==='Rules','i18n：en t(test.rules) → Rules');
   ok(I.t('test.day',{d:6})==='— Day 6 starts —','i18n：en 參數填入 {d}',I.t('test.day',{d:6}));
   ok(I.t('test.only')==='只有中文','i18n：en 缺 key 退回 zh-TW');
   ok(I.t('no.such.key')==='no.such.key','i18n：兩邊都沒有就回傳 key');
   ok(I.t('ui.rules')==='Rules'&&I.t('ui.week',{w:2})==='Week 2','i18n：en t(ui.rules) → Rules、t(ui.week,{w:2}) → Week 2');
   newRun('laravel'); S.day=6; C.log('dim',I.t('test.day',{d:S.day}));
   ok(S.log[0].msg==='D06 — Day 6 starts —'&&!S.log[0].msg.includes('{'),'i18n：紀錄填好數字、沒有留下 {d}',S.log[0].msg);
   delete zh['test.rules']; delete en['test.rules']; delete zh['test.day']; delete en['test.day']; delete zh['test.only'];
   look('zh-TW'); resetStore();
  }
});

section("字典一致性：key 集合、程式裡寫死的 key、題庫長度",()=>{
  /* 字典一致性：key 集合、程式裡寫死的 key、題庫長度 */
  {
   const zh=I.LANGS[0].dict, zk=new Set(Object.keys(zh));
   /* 回傳各語言字典和 zh-TW 對不上的地方（多的 key、en 缺的 key、題庫長度不同） */
   const dictProblems=langs=>{const z=langs[0].dict, k0=new Set(Object.keys(z)), out=[];
     for(const L of langs.slice(1)){
       for(const k of Object.keys(L.dict)) if(!k0.has(k)) out.push(`${L.id} 多了 ${k}`);
       if(L.id==='en') for(const k of k0) if(!(k in L.dict)) out.push(`en 缺 ${k}`);
       for(const k of Object.keys(L.dict)) if(k.startsWith('pool.')&&(!Array.isArray(L.dict[k])||L.dict[k].length!==(z[k]||[]).length)) out.push(`${L.id} 題庫長度不同 ${k}`);
     }
     return out;};
   const dp=dictProblems(I.LANGS);
   ok(!dp.length,'i18n 字典：各語言 key 與題庫長度都和 zh-TW 一致',dp.join(', '));
   /* 失敗的情況也要擋得下來：zh-TW 多一個 key、題庫少一條（記憶體裡的複本，不動檔案） */
   {const extraZh=[{id:'zh-TW',dict:{...zh,'tmp.only':'x'}},...I.LANGS.slice(1)];
    ok(dictProblems(extraZh).includes('en 缺 tmp.only'),'i18n 字典：en 少了 zh-TW 的 key 會被抓到');
    const en=I.LANGS[1].dict, shortPool=[I.LANGS[0],{id:'en',dict:{...en,'pool.laravel.1':en['pool.laravel.1'].slice(1)}}];
    ok(dictProblems(shortPool).includes('en 題庫長度不同 pool.laravel.1'),'i18n 字典：題庫長度不同會被抓到');}
   const dir=new URL('../../public/js/',import.meta.url), used=[];
   for(const f of readdirSync(dir).filter(f=>f.endsWith('.js'))){
     const src=stripComments(readFileSync(new URL(f,dir),'utf8'));
     for(const m of src.matchAll(/(?<![\w.$])tl?\('([^']+)'/g)) if(!zk.has(m[1])) used.push(`${f}: ${m[1]}`);
   }
   ok(!used.length,'i18n 字典：程式裡寫死的 t()/tl() key 都在 zh-TW',used.join(', '));
   /* 搬完字串的模組：註解以外不能有中文（CJK 標點、漢字、全形字） */
   const CJK=/[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]/;
   const cjkLines=src=>stripComments(src).split('\n').map((l,n)=>CJK.test(l)?n+1:0).filter(Boolean);
   for(const f of I18N_DONE){
     const bad=cjkLines(readFileSync(new URL(f,dir),'utf8'));
     ok(!bad.length,`i18n：${f} 註解以外沒有中文`,`第 ${bad.slice(0,8).join(', ')} 行`);
   }
   /* 失敗的情況：字面值裡的中文會被抓到，註解裡的不算 */
   ok(cjkLines("// 註解\nconst a=1;\nconst b='規則';").join()==='3'&&!cjkLines('/* 規則 */ const x=`a${1}b`; // 中文').length,'i18n：程式碼裡的中文字面值會被抓到，註解不算');
   /* 英文模式的遊戲畫面 */
   newRun('laravel','parallel'); S.issues=[makeIssue(false)]; sel.issue=S.issues[0].id; I.setLang('en'); render();
   ok(/<button class="btn ghost rbtn" data-act="rules">Rules<\/button>/.test(els.app.innerHTML),'i18n：英文模式標頭的規則按鈕是 Rules');
   I.setLang('zh-TW'); resetStore();
   /* 英文模式逐一觸發隨機事件（亂數固定 0：廠商是 Anthropic），標題與內容沒有中文、沒有剩下的 {} */
   {const rnd0=Math.random; I.setLang('en'); const seen=[];
    for(const day of [3,9]) for(const mon of [false,true]) for(let k=0;k<EVENTS.length;k++){
      newRun('laravel'); S.day=day; S.kpi=day===3?0:500; S.inv.monitor=mon; Math.random=()=>0; let e; try{e=EVENTS[k]();}finally{Math.random=rnd0;}
      seen.push(e.join(' '));
      ok(!CJK.test(e.join(''))&&!/[{}]/.test(e.join('')),`i18n：英文事件 ${k}（第 ${day} 天${mon?'、有監控':''}）`,e.join(' / '));
    }
    I.setLang('zh-TW');}
   /* 資料欄位跟著語言：工作內容名稱、電腦說明帶入常數 */
   I.setLang('en');
   ok(dataModule.companyName(['laravel','rust'])==='Laravel backend + Rust infrastructure','i18n：英文工作內容名稱用 + 串起來',dataModule.companyName(['laravel','rust']));
   ok(dataModule.HW.pc.desc.includes(String(dataModule.PC_SPEED))&&!CJK.test(dataModule.HW.pc.desc),'i18n：英文電腦說明帶入 PC_SPEED',dataModule.HW.pc.desc);
   const texts=[...Object.values(dataModule.INVEST).flatMap(v=>[v.name,v.desc,v.lv2?.desc||'']),...Object.values(dataModule.HW).flatMap(v=>[v.name,v.price,v.desc]),...Object.values(dataModule.CONF).map(v=>v.name),...Object.values(dataModule.CONF_CATS),...dataModule.CLIENTS.map(c=>c.name),St.GIG_CLIENT.name,...Object.values(dataModule.BILL_LABEL),...dataModule.EFFORT.map(e=>e.name),...[0,1,2].map(i=>dataModule.SDD_NAME[i]+dataModule.SDD_EG[i]),...Object.values(STACKS).flatMap(v=>[v.name,v.company,v.desc]),...Object.values(VENDORS).flatMap(v=>[v.name,v.agent,...v.plans.map(p=>p.name),...v.models.map(m=>m.name)]),...C.REVIEW.map(r=>r.name)];
   const zhLeft=texts.filter(x=>CJK.test(x));
   ok(!zhLeft.length,'i18n：英文模式的資料欄位沒有中文',zhLeft.join(' / '));
   I.setLang('zh-TW');
   ok(dataModule.companyName(['laravel','rust'])==='Laravel 後端＋Rust 基礎設施','i18n：繁中工作內容名稱不變');
   /* 題庫照位置抽：同一組亂數，中英兩局每張工單的題庫位置與數字都一樣 */
   {const rnd0=Math.random;
    const flat=k=>dataModule.POOL_KEYS.flatMap(n=>STACKS[k].pool[n].map(x=>typeof x==='string'?x:x.t));
    const gen=lang=>{I.setLang(lang); seedRandom(7); newRun(['laravel','rust']); S.day=12; const out=[...Array(200)].map(()=>makeIssue(false)); return out.map(i=>({...i,pos:flat(i.stack).indexOf(i.title)}));};
    const zhI=gen('zh-TW'), enI=gen('en'); Math.random=rnd0;
    const num=i=>JSON.stringify([i.stack,i.cx,i.due,i.kpi,i.base,i.trap,i.trueCx,i.research,i.sens,i.big,i.store,i.client.ban,i.pos]);
    ok(zhI.every(i=>i.pos>=0)&&enI.every(i=>i.pos>=0),'i18n：每張工單的標題都在自己語言的題庫裡');
    ok(zhI.every((i,n)=>num(i)===num(enI[n])),'i18n：同一組亂數，中英兩局的題庫位置與數字都相同');
    ok(enI.every(i=>!CJK.test(i.title)&&(!i.parts||i.parts.every(p=>!CJK.test(p)))),'i18n：英文工單標題（含研究單拆單）沒有中文');
    I.setLang('zh-TW');}
   /* 英文整局：單線、平行各玩完 20 天，畫面、彈窗、紀錄都沒有中文 */
   for(const mode of ['serial','parallel']){
    const rnd0=Math.random; seedRandom(11); I.setLang('en'); newRun(['laravel','app'],mode); S.outsource=true;
    const bad=[], chk=(where,h)=>{const html=h.replace(/<div class="lang"[\s\S]*?<\/div>/,''); /* 語言按鈕用各自的語言寫，不算 */ if(CJK.test(html))bad.push(`${where}: ${html.replace(/<[^>]+>/g,' ').match(/.{0,30}[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef].{0,30}/)[0]}`);};
    showSetup(false); chk('setup',els.mo.innerHTML); showSetup(true); chk('setup-adj',els.mo.innerHTML);
    let guard=0;
    while(guard++<40){
      invest('tests'); invest('md','laravel');
      for(const is of S.issues.filter(i=>!i.running).slice(0,4)){
        sel.issue=is.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:is.out?'api':'corp',rv:1});
        if(is.research&&guard%2) A.research('self'); else if(guard%3===0&&C.manualHrs(is)<=S.hours&&!C.manualBlocked()) manual(); else if(guard%4===1&&A.canEvaluate(is)) evaluate(); else dispatch();
      }
      if(mode==='parallel') A.wait(false);
      render(); chk('render',els.app.innerHTML);
      if(S.day>=20){ endDay(); chk('end',els.mo.innerHTML); break; }
      endDay(); chk('day',els.mo.innerHTML);
    }
    ok(S.day===20&&els.mo.innerHTML.includes('Month-end report'),`i18n：英文整局（${mode}）玩到月底結算`,S.day);
    M.showResume({S:{day:5,companies:['laravel'],mode,slots:3}}); chk('resume',els.mo.innerHTML);
    M.showBadSave(); chk('badsave',els.mo.innerHTML);
    for(const l of S.log) chk('log',l.msg);
    Math.random=rnd0;
    ok(!bad.length,`i18n：英文整局（${mode}）畫面、彈窗、紀錄沒有中文`,bad.slice(0,6).join(' ／ '));
    ok(S.log.length>50,`i18n：英文整局（${mode}）有寫紀錄`,S.log.length);
    I.setLang('zh-TW');
   }
   /* 規則 modal 英文：每個分頁沒有中文，數字跟繁中版一樣 */
   {const nums=h=>(h.replace(/<[^>]+>/g,' ').match(/\d+(\.\d+)?/g)||[]).sort().join(',');
    for(const tb of Ru.RULE_TABS){
      /* 電腦價格換了單位（12 萬 → 120,000），不比 */
      const noPrice=h=>dataModule.HW_KEYS.reduce((x,k)=>x.split(dataModule.HW[k].price).join(''),h);
      I.setLang('zh-TW'); const zhH=noPrice(Ru.rulesTab(tb.id)); I.setLang('en'); const enH=noPrice(Ru.rulesTab(tb.id));
      ok(!CJK.test(enH),`i18n：規則「${tb.id}」英文沒有中文`,(enH.replace(/<[^>]+>/g,' ').match(/.{0,30}[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef].{0,30}/)||[''])[0]);
      ok(nums(zhH)===nums(enH),`i18n：規則「${tb.id}」中英數字相同`,`${nums(zhH)} ／ ${nums(enH)}`);
    }
    Ru.showRules(); ok(!CJK.test(els.mo.innerHTML)&&els.mo.innerHTML.includes('Game rules'),'i18n：英文規則 modal 標題與分頁');
    I.setLang('zh-TW');}
   /* 語言切換（標頭按鈕） */
   {const clickLang=id=>els.app.on.click({target:{closest:()=>({dataset:{lang:id},disabled:false})}});
    const ge=[]; globalThis.gtag=(k,n,p)=>ge.push({n,p});
    /* 點目前的語言：什麼都不做、不存偏好 */
    I.setLang('zh-TW'); resetStore(); newRun('laravel'); clickLang('zh-TW');
    ok(I.lang==='zh-TW'&&!(I.LANG_KEY in store),'i18n：點目前的語言不存偏好');
    /* 遊戲中途切換：狀態、存檔不變，不送 GA、不寫紀錄，兩個 agent 照跑 */
    resetStore(); I.setLang('zh-TW'); resetStore(); newRun('laravel','parallel'); S.day=7; S.issues=[makeIssue(false),makeIssue(false),makeIssue(false)];
    for(const is of S.issues.slice(0,2)){sel.issue=is.id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'corp',rv:0}); dispatch();}
    /* 案主名稱是跟著語言的標籤，比狀態時用 id */
    const snap=()=>JSON.stringify(S,(k,v)=>k==='client'&&v?.id?v.id:v);
    St.saveGame(null); const save0=store['tokgame-save'], s0=snap(), n0=ge.length;
    render(); ok(/data-lang="en"/.test(els.app.innerHTML)&&/class="on" data-lang="zh-TW"/.test(els.app.innerHTML),'i18n：標頭有每個語言的按鈕，目前語言亮起來');
    clickLang('en');
    ok(I.lang==='en'&&store[I.LANG_KEY]==='en'&&globalThis.document.documentElement.lang==='en','i18n：切到英文，偏好存進 tokgame-lang、<html lang> 是 en');
    ok(els.app.innerHTML.includes('Ticket queue')&&els.app.innerHTML.includes('Background agents'),'i18n：切換後畫面重畫成英文');
        ok(snap()===s0&&store['tokgame-save']===save0&&ge.length===n0&&S.jobs.length===2,'i18n：切換不改狀態、不寫存檔、不送 GA、不寫紀錄，agent 照跑');
    /* 重新整理：偏好保留，繼續上一局的提示也是英文 */
    boot(); ok(I.lang==='en'&&els.mo.innerHTML.includes('Continue your last game?'),'i18n：重新整理後沿用英文（含繼續上一局）');
    /* localStorage 寫不進去：還是切得過去，重新整理再看瀏覽器語言 */
    I.setLang('zh-TW'); resetStore(); const set0=globalThis.localStorage.setItem; globalThis.localStorage.setItem=()=>{throw new Error('blocked');};
    let threw=false; try{clickLang('en');}catch(e){threw=true;}
    globalThis.localStorage.setItem=set0;
    ok(!threw&&I.lang==='en'&&!(I.LANG_KEY in store),'i18n：localStorage 擋住時照樣切到英文、不報錯');
    I.initLang(); ok(I.lang==='zh-TW','i18n：擋住時重新整理照瀏覽器語言（zh-TW）');
    /* 已經寫的紀錄與工單標題維持原本的語言 */
    resetStore(); I.setLang('zh-TW'); newRun('laravel'); firstIssues(); const t0=S.issues[0].title, first=S.log[S.log.length-1].msg;
    clickLang('en'); render();
    ok(CJK.test(t0)&&els.app.innerHTML.includes(t0)&&els.app.innerHTML.includes('Ticket queue'),'i18n：佇列裡的工單維持中文標題，卡片標籤是英文');
    endDay(); const msgs=S.log.map(l=>l.msg);
    ok(msgs.includes(first)&&CJK.test(first)&&msgs.some(m=>m.includes('Day 1 done'))&&msgs.some(m=>m.includes('Day 2 starts')),'i18n：切換後舊紀錄維持中文、新紀錄是英文');
    /* 中文寫的存檔用英文讀 */
    resetStore(); I.setLang('zh-TW'); newRun('laravel'); S.day=4; endDay(); const rep=(JSON.parse(store['tokgame-save']).morning||{}).rep||[];
    I.setLang('en'); const d=St.readSave();
    ok(d&&!d.bad&&d.S.day===5,'i18n：中文存檔在英文模式下讀得到',JSON.stringify(d&&{bad:d.bad,day:d.S?.day}));
    M.showResume(d); els.mo.onclick({target:{closest:()=>({dataset:{act:'resume'}})}});
    ok(els.app.innerHTML.includes('Ticket queue')&&els.mo.innerHTML.includes('Start working')&&rep.every(x=>els.mo.innerHTML.includes(x)),'i18n：讀檔後畫面英文，早上報告照存的內容');
    /* 開局視窗也能換語言，已選的項目保留 */
    I.setLang('zh-TW'); resetStore(); start(); const g0=ge.length;
    const clickMo=ds=>els.mo.onclick({target:{closest:()=>({dataset:ds})}});
    clickMo({company:'rust'}); clickMo({company:'laravel'}); clickMo({mode:'parallel'}); clickMo({slots:'4'});
    ok(/class="on" data-lang="zh-TW"/.test(els.mo.innerHTML),'i18n：開局視窗有語言按鈕');
    clickMo({lang:'en'});
    const mh=els.mo.innerHTML;
    ok(mh.includes('Start of the month')&&/sel" data-company="rust"/.test(mh)&&/sel" data-mode="parallel"/.test(mh)&&/sel" data-slots="4"/.test(mh)&&!/sel" data-company="laravel"/.test(mh),'i18n：開局視窗切到英文，Rust、平行、4 個 agent 保留');
    ok(store[I.LANG_KEY]==='en'&&ge.length===g0&&els.app.innerHTML.includes('Ticket queue'),'i18n：開局視窗切換存偏好、不送 GA、背後畫面也換');
    showSetup(true); clickMo({lang:'zh-TW'}); ok(els.mo.innerHTML.includes('週一：調整訂閱'),'i18n：週一調整訂閱也能切回繁中');
    delete globalThis.gtag; I.setLang('zh-TW'); resetStore();}
   /* 頁尾：只顯示目前語言那份，其他的留著但隱藏 */
   {const fb=lg=>els.about.blocks.find(b=>b.dataset.lang===lg);
    I.setLang('en'); ok(fb('en').hidden===false&&fb('zh-TW').hidden===true&&els.about.blocks.length===2,'i18n：英文時只顯示英文頁尾，中文頁尾還在但隱藏');
    I.setLang('zh-TW'); ok(fb('zh-TW').hidden===false&&fb('en').hidden===true,'i18n：繁中時只顯示中文頁尾');
    resetStore();}
   /* GA：同一張單用中文和英文派工，送出的事件一模一樣 */
   {const rnd0=Math.random, runGa=lg=>{const ge=[]; globalThis.gtag=(k,n,p)=>ge.push({n,p}); I.setLang(lg); seedRandom(5); newRun('laravel'); S.issues=[makeIssue(false)];
      sel.issue=S.issues[0].id; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'corp',rv:1}); dispatch(); delete globalThis.gtag; return JSON.stringify(ge);};
    const gz=runGa('zh-TW'), gn=runGa('en'); Math.random=rnd0;
    ok(gz===gn&&gz.includes('"dispatch"')&&gz.includes('"job_result"'),'i18n：中英派工送出的 GA 事件與參數相同',`${gz.slice(0,160)} ／ ${gn.slice(0,160)}`);
    I.setLang('zh-TW'); resetStore();}
   /* 開局說明：錢不算分 */
   ok(I.LANGS[0].dict['ui.setup.r.late'].includes('錢不算分')&&!I.LANGS[0].dict['ui.setup.r.late'].includes('花了多少錢')&&I.LANGS[1].dict['ui.setup.r.late'].includes('money does not score'),'開局說明：月底結算看 KPI、信任與稽核，錢不算分');
  }
});
