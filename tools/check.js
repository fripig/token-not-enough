// 規則檢查（非遊戲本體）
// 用法：node tools/check.js [spec 名稱 …]（預設固定種子；CHECK_SEED=<整數> 換種子，CHECK_SEED=random 用真亂數）
// 斷言照 spec 分在 tools/check/<spec>.test.js，用 Node 內建的 node:test 跑，每個檔各自一個 process。
// 沒帶參數就全跑；帶 spec 名稱只跑那幾份。任何一條斷言不符就以非 0 結束。
import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
// 先檢查 CHECK_SEED，格式不對就在跑任何測試之前以 1 結束
import './check-seed.js';

const dir=new URL('./check/',import.meta.url);
const names=readdirSync(dir).filter(f=>f.endsWith('.test.js')).map(f=>f.slice(0,-'.test.js'.length)).sort();
const want=process.argv.slice(2);
const unknown=want.filter(n=>!names.includes(n));
if(unknown.length){
  console.error(`沒有這份檢查：${unknown.join(', ')}\n可用的名稱：${names.join(' ')}`);
  process.exit(1);
}
const files=(want.length?want:names).map(n=>new URL(`${n}.test.js`,dir).pathname);
const r=spawnSync(process.execPath,['--test','--test-reporter=spec',...files],{stdio:'inherit'});
process.exitCode=r.status??1;
