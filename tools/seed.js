// SIM_SEED=<整數> 時用固定種子取代 Math.random；要在載入遊戲模組之前 import，開局抽的工單才會用到同一串亂數
if(process.env.SIM_SEED!==undefined){
  const seed=Number(process.env.SIM_SEED);
  if(process.env.SIM_SEED.trim()===''||!Number.isInteger(seed)){ console.error(`SIM_SEED 必須是整數，收到「${process.env.SIM_SEED}」`); process.exit(1); }
  // mulberry32
  let t=seed>>>0;
  Math.random=()=>{t=(t+0x6D2B79F5)>>>0;let r=Math.imul(t^(t>>>15),1|t);r=(r+Math.imul(r^(r>>>7),61|r))^r;return((r^(r>>>14))>>>0)/4294967296;};
}
