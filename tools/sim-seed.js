// SIM_SEED=<整數> 時 tools/sim.js 用固定種子取代 Math.random；要在載入遊戲模組之前 import
// 只給模擬器用，tools/check.js 不讀 SIM_SEED
import {seedRandom} from './seed.js';
if(process.env.SIM_SEED!==undefined){
  const seed=Number(process.env.SIM_SEED);
  if(process.env.SIM_SEED.trim()===''||!Number.isInteger(seed)){ console.error(`SIM_SEED 必須是整數，收到「${process.env.SIM_SEED}」`); process.exit(1); }
  seedRandom(seed);
}
