const TexParse = require('../js/latex.js');
const body = `
2(b)(i) & 19.6 or 20 N & B1 \\\\ \\hline
 & 80 times 3 times = 90 times & B1 \\\\ \\cline{2-3}
\\multirow{-2}{1.9cm}{2(b)(ii)} & 52 (N) and weight & B1 \\\\ \\hline
`;
const rows = TexParse.extractMstabRows('\\begin{mstab}{q2color}' + body + '\\end{mstab}', {});
console.log(JSON.stringify(rows, null, 2));
