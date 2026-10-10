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
    ok(CJK.test(t0)&&!els.app.innerHTML.includes(t0)&&els.app.innerHTML.includes(St.issueTitle?.(S.issues[0])??'\u0000')&&els.app.innerHTML.includes('Ticket queue'),'i18n：切換後佇列裡的工單標題跟著換成英文（gh-38-01）');
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

section("工單標題跟著目前語言（gh-38-01-untranslated-tickets）",()=>{
  const IT=is=>St.issueTitle?St.issueTitle(is):is.title, CJK=/[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]/;
  const zhD=I.LANGS[0].dict, enD=I.LANGS[1].dict;
  const at=(D,src)=>{const e=D[`pool.${src.k}.${src.g}`]?.[src.i]; return src.g==='research'?('p' in src?e?.parts?.[src.p]:e?.t):e;};
  const rnd0=Math.random;
  /* 各種工單：zh-TW 產生，切到英文看題庫同位置的英文標題，切回來是中文 */
  I.setLang('zh-TW'); seedRandom(5); newRun(['laravel','sre']); S.day=15; S.outsource=true;
  const gen=[...Array(400)].map(()=>makeIssue(false)), incs=[...Array(30)].map(()=>makeIssue(true)), gigs=[...Array(60)].map(()=>St.makeGig());
  Math.random=rnd0;
  const all=[...gen,...incs,...gigs];
  ok(all.every(i=>i.src&&at(zhD,i.src)===i.title),'標題：產生的工單都記下題庫位置，位置指到產生時的標題',JSON.stringify(all.find(i=>!i.src||at(zhD,i.src)!==i.title)));
  ok(gen.some(i=>i.trap&&i.src?.g==='trap')&&gen.some(i=>i.src?.g==='research')&&gen.some(i=>/^[1-5]$/.test(i.src?.g))&&incs.every(i=>i.src?.g==='inc'),'標題：抽樣涵蓋一般、陷阱暗示標題、研究單、事故單');
  /* 案主名稱是照目前語言的 getter，比對時案主只看 id，另外確認還是同一個物件 */
  const fields=i=>JSON.stringify({...i,client:i.client.id}), snap=all.map(fields), cl=all.map(i=>i.client);
  I.setLang('en');
  ok(all.every((i,n)=>fields(i)===snap[n]&&i.client===cl[n]),'標題：切換語言不改任何工單欄位');
  ok(all.every(i=>IT(i)===at(enD,i.src)&&!CJK.test(IT(i))),'標題：切到英文後一般、陷阱、事故、外包、研究單都顯示同位置的英文標題',JSON.stringify(all.find(i=>IT(i)!==at(enD,i.src))?.src));
  const trap=gen.find(i=>i.trap&&i.src.g==='trap'); A.reveal(trap);
  ok(trap.revealed&&IT(trap)===at(enD,trap.src),'標題：陷阱曝光後仍顯示英文暗示標題');
  I.setLang('zh-TW');
  ok(all.every(i=>IT(i)===i.title),'標題：切回繁中顯示原本的中文標題');
  /* 研究單拆單：兩張各指到同一筆研究題的第一、第二張 */
  {newRun('laravel'); const r=gen.find(i=>i.research); S.issues=[r]; sel.issue=r.id; const [a,b]=A.splitResearch(r);
   ok(a.src?.p===0&&b.src?.p===1&&a.src.i===r.src.i&&a.title===r.parts[0]&&b.title===r.parts[1],'標題：拆單記下研究題位置與第幾張',JSON.stringify([a.src,b.src]));
   I.setLang('en'); ok(IT(a)===at(enD,a.src)&&IT(b)===at(enD,b.src)&&IT(a)!==IT(b),'標題：切到英文後兩張拆單顯示英文拆單標題',IT(a)+' / '+IT(b)); I.setLang('zh-TW');}
  /* 合併衝突：跑馬燈文字錯字 → Resolve conflict: Typo in the news ticker */
  {newRun('laravel','parallel'); S.hours=8; const is=Object.assign(makeIssue(false),{title:'跑馬燈文字錯字',src:{k:'laravel',g:'1',i:0},store:false,trap:false});
   S.issues=[is]; const son=dataModule.model('anthropic','sonnet');
   Math.random=()=>0; A.settle({issue:is,v:'anthropic',m:'sonnet',ef:1,b:'corp',M:son,rv:0,tk:100,hrs:1,ok:true,caught:false,left:0,hidden:false,stop:false,sdd:0},{conflict:1}); Math.random=rnd0;
   ok(is.merge&&is.title==='解決衝突：跑馬燈文字錯字'&&IT(is)==='解決衝突：跑馬燈文字錯字','標題：合併衝突單繁中顯示「解決衝突：跑馬燈文字錯字」',IT(is));
   I.setLang('en'); ok(IT(is)==='Resolve conflict: Typo in the news ticker','標題：切到英文後是 Resolve conflict: Typo in the news ticker',IT(is)); I.setLang('zh-TW');}
  /* 沒拆就直接派工的研究單撞到合併衝突：前綴加研究題標題 */
  {newRun('laravel','parallel'); S.hours=8; const r={...gen.find(i=>i.research),store:false}; S.issues=[r];
   Math.random=()=>0; A.settle({issue:r,v:'anthropic',m:'sonnet',ef:1,b:'corp',M:dataModule.model('anthropic','sonnet'),rv:0,tk:100,hrs:1,ok:true,caught:false,left:0,hidden:false,stop:false,sdd:0},{conflict:1}); Math.random=rnd0;
   ok(r.merge&&!r.research&&IT(r)===`解決衝突：${at(zhD,r.src)}`,'標題：研究單合併衝突後繁中是「解決衝突：<研究題>」',IT(r));
   I.setLang('en'); ok(IT(r)===`Resolve conflict: ${at(enD,r.src)}`&&!CJK.test(IT(r)),'標題：切到英文後是 Resolve conflict: <英文研究題>',IT(r)); I.setLang('zh-TW');}
  /* 沒有題庫位置（舊存檔）與查不到位置：顯示存的字串 */
  {I.setLang('en');
   const old={title:'舊標題',stack:'laravel'}, oldMerge={title:'解決衝突：舊標題',merge:true,stack:'laravel'}, far={title:'存的標題',src:{k:'laravel',g:'1',i:9}}, farP={title:'存的拆單',src:{k:'laravel',g:'research',i:0,p:5}}, badK={title:'壞掉',src:{k:'nope',g:'1',i:0}};
   ok(IT(old)==='舊標題'&&IT(oldMerge)==='解決衝突：舊標題','標題：舊存檔沒有題庫位置的工單（含合併衝突單）顯示存的標題');
   ok(IT(far)==='存的標題'&&IT(farP)==='存的拆單'&&IT(badK)==='壞掉','標題：位置超出題庫或技術線不存在時顯示存的標題');
   I.setLang('zh-TW');}
  /* 畫面：卡片、派工台標題、背景 agent 列 */
  {resetStore(); I.setLang('zh-TW'); newRun('laravel','parallel'); S.hours=8;
   const a=Object.assign(makeIssue(false),{title:'跑馬燈文字錯字',src:{k:'laravel',g:'1',i:0}}), b=Object.assign(makeIssue(false),{title:'RSS 日期時區差 8 小時',src:{k:'laravel',g:'1',i:1},running:true});
   S.issues=[a,b]; S.jobs=[{issue:b,v:'anthropic',m:'sonnet',ef:1,b:'corp',M:dataModule.model('anthropic','sonnet'),rv:0,tk:100,hrs:2,shownHrs:2,left:1,ok:true,caught:false,hidden:false,stop:false,sdd:0}]; sel.issue=a.id;
   I.setLang('en'); render(); const h=els.app.innerHTML;
   ok(h.includes('<span class="t">Typo in the news ticker</span>')&&h.includes('<p class="dpt">Typo in the news ticker</p>')&&h.includes('<b>RSS dates off by 8 hours</b>')&&!h.includes('跑馬燈文字錯字')&&!h.includes('RSS 日期時區差'),'畫面：切到英文後卡片、派工台標題、背景 agent 列都是英文標題');
   I.setLang('zh-TW'); render(); ok(els.app.innerHTML.includes('跑馬燈文字錯字')&&els.app.innerHTML.includes('RSS 日期時區差 8 小時'),'畫面：切回繁中又是中文標題');}
  /* 紀錄：切換前寫的不變，切換後寫的用英文標題 */
  {resetStore(); I.setLang('zh-TW'); newRun('laravel'); S.day=2; S.hours=8;
   const a=Object.assign(makeIssue(false),{title:'跑馬燈文字錯字',src:{k:'laravel',g:'1',i:0},due:5,trap:false,store:false,inc:false});
   S.issues=[a]; Object.assign(sel,{v:'anthropic',m:'sonnet',b:'api',rv:0,ef:1}); sel.issue=a.id;
   const before=S.log.map(l=>l.msg);
   I.setLang('en'); Math.random=()=>.5; dispatch(); Math.random=rnd0;
   const msgs=S.log.map(l=>l.msg), added=msgs.slice(0,msgs.length-before.length);
   ok(added.some(m=>m.includes('Typo in the news ticker'))&&!added.some(m=>m.includes('跑馬燈文字錯字'))&&before.every((m,n)=>msgs[msgs.length-before.length+n]===m),'紀錄：切換後派工的紀錄寫英文標題，之前的紀錄不變',added.join(' / '));
   I.setLang('zh-TW');}
  /* 存檔：中文寫的存檔用英文讀，佇列標題是英文 */
  {resetStore(); I.setLang('zh-TW'); newRun('laravel'); firstIssues(); S.day=4; endDay();
   const zhT=S.issues.map(i=>i.title); I.setLang('en'); const d=St.readSave();
   M.showResume(d); els.mo.onclick({target:{closest:()=>({dataset:{act:'resume'}})}});
   const h=els.app.innerHTML;
   ok(S.issues.length>0&&S.issues.every(i=>i.src&&h.includes(IT(i))&&!CJK.test(IT(i)))&&zhT.every(x=>!h.includes(x)),'存檔：繁中存檔用英文讀，佇列工單顯示英文標題');
   I.setLang('zh-TW'); resetStore();}
});
