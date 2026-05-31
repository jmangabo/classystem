const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const searchSelect = `{Array.from({ length: globalNumTerms }, (_, i) => i + 1).map(q => {
                      const offered = !selectedSubject?.offeredTerms || selectedSubject?.offeredTerms.length === 0 || selectedSubject?.offeredTerms.includes(q as TermNumber);
                      return (
                        <option key={q} value={q} disabled={!offered}>
                          {q === 1 ? '1st' : q === 2 ? '2nd' : q === 3 ? '3rd' : '4th'} Term {!offered && "(Not Offered)"}
                        </option>
                      )
                    })}`;

const replaceSelect = `{Array.from({ length: globalNumTerms }, (_, i) => i + 1).filter(q => !selectedSubject?.offeredTerms || selectedSubject?.offeredTerms.length === 0 || selectedSubject?.offeredTerms.includes(q as TermNumber)).map(q => {
                      return (
                        <option key={q} value={q}>
                          {q === 1 ? '1st' : q === 2 ? '2nd' : q === 3 ? '3rd' : '4th'} Term
                        </option>
                      )
                    })}`;


code = code.split(searchSelect).join(replaceSelect);
fs.writeFileSync('src/App.tsx', code);
console.log('Done 2!');
