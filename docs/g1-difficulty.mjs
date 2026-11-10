export const g1BossNumbers=new Set([31,39,105,108,109,111,112,116,117,119]);
export function g1Stage(q) {
  return g1BossNumbers.has(q.sourceNumber) ? 'BOSS' : q.promptType;
}
export function g1DifficultyLabel(q){return g1Stage(q)==='BOSS'?'👑 注音魔王城':q.promptType==='IMAGE'?'🌱 注音新手村':'🚀 辨音探險隊';}
