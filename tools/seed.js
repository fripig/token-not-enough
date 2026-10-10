// 用 mulberry32 固定種子取代 Math.random；要在載入遊戲模組之前呼叫，開局抽的工單才會用到同一串亂數
// tools/sim-seed.js（SIM_SEED）與 tools/check-seed.js（CHECK_SEED）共用
export function seedRandom(seed){
  let t=seed>>>0;
  Math.random=()=>{t=(t+0x6D2B79F5)>>>0;let r=Math.imul(t^(t>>>15),1|t);r=(r+Math.imul(r^(r>>>7),61|r))^r;return((r^(r>>>14))>>>0)/4294967296;};
}
