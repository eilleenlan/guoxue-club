// 題庫之外也有合理同音詞或異體寫法，反向出題時保守排除。
export const permitExclusions = new Map([
  [9, '印章／印張'],
  [15, '皺紋／咒文'],
  [33, '砧板／針板'],
  [44, '朋友有輕聲讀法'],
  [48, '風箏有輕聲讀法'],
  [84, '彩虹／綵虹'],
  [91, '山崖的崖有不同讀法'],
  [94, '湯匙的匙有不同讀法'],
  [98, '真熱鬧的鬧有輕聲讀法'],
  [107, '縫衣服的服有輕聲讀法'],
  [110, '司令臺／司令台'],
  [111, '狼吞虎嚥／狼吞虎咽'],
  [117, '細嚼慢嚥／細嚼慢咽'],
  [12, '拼圖／拚圖'],
  [45, '蜜蜂／密封'],
  [46, '請客／頃刻'],
  [53, '晴天／擎天'],
  [60, '鈴鼓／靈骨'],
  [63, '游泳／遊泳'],
  [66, '燈塔／登塔'],
  [70, '眼睛有輕聲讀法'],
  [85, '精神有輕聲讀法'],
  [93, '進來／近來'],
]);

const syllable = /^(?:˙[ㄅ-ㄩ]{1,3}|[ㄅ-ㄩ]{1,3}[ˊˇˋ]?)$/u;
const readingKey = reading => reading.replace(/\s/gu, '');

export function selectPermitCandidates(bank) {
  const wordsByReading = new Map();
  for (const q of bank.entries) {
    if (q.status !== 'READY' || !q.correctOption || !q.word) continue;
    const key = readingKey(q.correctOption);
    if (!wordsByReading.has(key)) wordsByReading.set(key, new Set());
    wordsByReading.get(key).add(q.word);
  }
  return bank.entries.filter(q => {
    if (q.status !== 'READY' || q.permitEligible === false || permitExclusions.has(q.sourceNumber)) return false;
    if (!/^\p{Script=Han}{2,}$/u.test(q.word) || !q.correctOption) return false;
    const parts = q.correctOption.split(' ');
    return q.correctOption === q.sourceZhuyin &&
      parts.length === [...q.word].length &&
      parts.every(part => syllable.test(part)) &&
      wordsByReading.get(readingKey(q.correctOption)).size === 1;
  });
}

export function matchesPermitAnswer(input, answer) {
  return input.trim() === answer;
}
