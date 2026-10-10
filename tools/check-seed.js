// tools/check.js 預設用固定種子，比例斷言每次結果都一樣；要在載入遊戲模組之前 import
// CHECK_SEED=<整數> 換種子，CHECK_SEED=random 用真的 Math.random
import {seedRandom} from './seed.js';
export const CHECK_SEED_DEFAULT=29;
const v=process.env.CHECK_SEED;
if(v===undefined) seedRandom(CHECK_SEED_DEFAULT);
else if(v!=='random'){
  const seed=Number(v);
  if(v.trim()===''||!Number.isInteger(seed)){ console.error(`CHECK_SEED 必須是整數或 random，收到「${v}」`); process.exit(1); }
  seedRandom(seed);
}
