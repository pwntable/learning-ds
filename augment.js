const fs = require('fs');

const content = fs.readFileSync('questions-data.js', 'utf8');
const dataMatch = content.match(/window\.QUESTIONS_DATA = (\{[\s\S]+\});/);

if (!dataMatch) {
  console.error("Could not find data");
  process.exit(1);
}

const data = eval("(" + dataMatch[1] + ")");

const dict = {
  "q1_2": { blanks: [["int", "long", "short"]] },
  "q1_3": { correct: ["Z", "'Z'", "\"Z\""] },
  "q1_5": { correct: ["double", "float"] },
  "q1_7": { blanks: [["count", "count;"]] },
  "q1_9": { correct: ["garbage", "random", "error", "undefined", "0"] },
  "q2_2": { correct: ["15", "15 "] },
  "q2_3": { blanks: [["main(", "main (", "main(void)", "main()"]] },
  "q2_5": { correct: ["printf", "puts"] },
  "q2_7": { correct: ["A\nB", "A\\nB", "AB", "A B"] },
  "q3_2": { correct: ["&age", "& age"] },
  "q3_3": { correct: ["2", "2.0", "2.5"] },
  "q3_4": { correct: ["1"] },
  "q3_6": { blanks: [["+=", "="]] },
  "q3_7": { correct: ["10"] },
  "q3_8": { correct: ["%f", "%lf", "%g"] },
  "q3_10": { blanks: [["%.2", ".2"]] },
  "q4_2": { correct: ["Pass", "\"Pass\""] },
  "q4_4": { correct: ["B", "\"B\""] },
  "q4_6": { correct: ["!=", "not eq", "<>"] },
  "q4_7": { correct: ["F", "\"F\""] },
  "q4_8": { blanks: [["<="]] },
  "q4_10": { correct: ["B", "\"B\""] },
  "q5_2": { blanks: [["else if", "elseif", "else   if"]] },
  "q5_3": { correct: ["A", "\"A\""] },
  "q5_5": { correct: ["break", "break;"] },
  "q5_6": { correct: ["AB", "A B", "A\nB"] },
  "q5_7": { blanks: [["default", "default:"]] },
  "q5_9": { correct: ["1"] },
  "q6_2": { correct: ["Go!Go!Go!", "Go! Go! Go!"] },
  "q6_3": { blanks: [["1", "true", "2"]] },
  "q6_5": { correct: ["6"] },
  "q6_6": { correct: ["continue", "continue;"] },
  "q6_7": { correct: ["0"] },
  "q6_9": { correct: ["321", "3 2 1", "3,2,1", "3, 2, 1"] },
  "q6_10": { blanks: [["break", "return", "exit", "break;", "return;"]] },
  "q7_2": { blanks: [["1", "1 "]] },
  "q7_3": { correct: ["30"] },
  "q7_5": { correct: ["ages"] },
  "q7_6": { correct: ["0", "garbage"] },
  "q7_8": { blanks: [["%s", "%s "]] },
  "q7_9": { correct: ["3", "3 "] },
  "q8_2": { blanks: [["next", "next_node"]] },
  "q8_4": { correct: ["2"] },
  "q8_5": { correct: ["ptr->data", "(*ptr).data", "ptr -> data"] },
  "q8_7": { correct: ["2"] },
  "q8_8": { blanks: [["malloc", "calloc"]] },
  "q8_10": { correct: ["NULL", "0"] },
  "q9_2": { blanks: [["FIFO", "First In First Out"]] },
  "q9_3": { correct: ["1"] },
  "q9_4": { correct: ["B", "'B'", "\"B\""] },
  "q10_2": { correct: ["8 15 4 5", "8, 15, 4, 5", "8,15,4,5"] },
  "q10_4": { blanks: [["fee", "fees"]] },
  "q10_5": { correct: ["20"] },
  "q10_6": { blanks: [["ptr->data", "(*ptr).data", "ptr -> data"]] }
};

let numChanged = 0;

for (const lessonId in data.lessons) {
  for (const q of data.lessons[lessonId].questions) {
    if (dict[q.id]) {
      if (dict[q.id].correct) {
        q.correct = dict[q.id].correct;
        numChanged++;
      }
      if (dict[q.id].blanks) {
        q.blanks = dict[q.id].blanks;
        numChanged++;
      }
    } else if (q.type === 'predict_output' || q.type === 'code_completion') {
       if (!Array.isArray(q.correct)) {
           q.correct = [q.correct];
           numChanged++;
       }
    } else if (q.type === 'fill_blank') {
       if (q.blanks && !Array.isArray(q.blanks[0])) {
           q.blanks = q.blanks.map(b => [b]);
           numChanged++;
       }
    }
  }
}

const newContent = "window.QUESTIONS_DATA = " + JSON.stringify(data, null, 2) + ";\n";
fs.writeFileSync('questions-data.js', newContent);
console.log("Updated questions-data.js. Changed " + numChanged + " items.");
