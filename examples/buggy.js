// BugLens demo file — every function here has a real logic bug.
// Highlight the marked lines, right-click, and pick "BugLens: Explain this bug".

// 1. Returns the wrong thing entirely.
//    Highlight: the `let sum = items.length;` line
function total(items) {
  let sum = items.length;
  return sum;
}

// 2. Crashes on the last iteration (or returns undefined-laced results).
//    Highlight: the whole for-loop
function doubleAll(numbers) {
  const doubled = [];
  for (let i = 0; i <= numbers.length; i++) {
    doubled.push(numbers[i] * 2);
  }
  return doubled;
}

// 3. Says 0.1 + 0.2 is not 0.3.
//    Highlight: the return line
function isThirtyCents(a, b) {
  return a + b === 0.3;
}

// 4. Sorts [1, 5, 10, 25] into [1, 10, 25, 5].
//    Highlight: the .sort() call
function sortScores(scores) {
  return scores.sort();
}

// 5. Skips elements while removing — some negatives survive.
//    Highlight: the whole for-loop
function removeNegatives(values) {
  for (let i = 0; i < values.length; i++) {
    if (values[i] < 0) {
      values.splice(i, 1);
    }
  }
  return values;
}

// 6. Logs "done" before any file is actually processed.
//    Highlight: the whole function body
async function processFiles(files, processOne) {
  files.forEach(async (file) => {
    await processOne(file);
  });
  console.log('done');
}
