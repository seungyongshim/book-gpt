export function diffWords(a, b) {
    if (a === b)
        return [{ value: a }];
    const aWords = a.split(/\s+/);
    const bWords = b.split(/\s+/);
    const dp = Array(aWords.length + 1).fill(0).map(() => Array(bWords.length + 1).fill(0));
    for (let i = aWords.length - 1; i >= 0; i--) {
        for (let j = bWords.length - 1; j >= 0; j--) {
            dp[i][j] = aWords[i] === bWords[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
    }
    const out = [];
    let i = 0, j = 0;
    while (i < aWords.length && j < bWords.length) {
        if (aWords[i] === bWords[j]) {
            out.push({ value: aWords[i] });
            i++;
            j++;
        }
        else if (dp[i + 1][j] >= dp[i][j + 1]) {
            out.push({ value: aWords[i], removed: true });
            i++;
        }
        else {
            out.push({ value: bWords[j], added: true });
            j++;
        }
    }
    while (i < aWords.length) {
        out.push({ value: aWords[i], removed: true });
        i++;
    }
    while (j < bWords.length) {
        out.push({ value: bWords[j], added: true });
        j++;
    }
    return out;
}
