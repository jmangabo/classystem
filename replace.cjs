const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
const search = `                    {summaryColumns.map(c => {
                      const qGrades = Array.from({ length: numTerms }, (_, i) => getColumnTermGrade(student, c, (i + 1) as TermNumber));
                      const fin = getColumnFinalGrade(student, c);
                      return (
                        <React.Fragment key={c.id}>
                          {qGrades.map((g, i) => (
                            <td key={i} className={\`p-1 text-center text-[10px] font-medium border border-black \${g === -1 ? 'text-slate-300' : 'text-slate-600'}\`}>
                              {g === -1 ? '-' : (useDescriptiveGrading && isGrade1To3 && g > 0 ? (<span className="text-indigo-600 font-bold">{getDescriptiveGrade(g)}</span>) : g || '')}
                            </td>
                          ))}
                          <td className={\`p-1 text-center text-[10px] font-bold border border-black \${fin >= 75 ? 'text-emerald-700' : 'text-rose-700'} bg-slate-50/30\`}>{useDescriptiveGrading && isGrade1To3 && fin ? getDescriptiveGrade(fin) : fin || ''}</td>
                        </React.Fragment>
                      );
                    })}`;
const replace = `                    {summaryColumns.map(c => {
                      const qGrades = Array.from({ length: numTerms }, (_, i) => getColumnTermGrade(student, c, (i + 1) as TermNumber));
                      const fin = getColumnFinalGrade(student, c);
                      return (
                        <React.Fragment key={c.id}>
                          {qGrades.map((g, i) => {
                            const isNotOffered = c.type === 'subject' && c.subject?.activeTerms && !c.subject.activeTerms.includes(i + 1);
                            return (
                              <td key={i} className={\`p-1 text-center text-[10px] font-medium border border-black \${isNotOffered ? 'bg-black' : g === -1 ? 'text-slate-300' : 'text-slate-600'}\`}>
                                {isNotOffered ? '' : (g === -1 ? '-' : (useDescriptiveGrading && isGrade1To3 && g > 0 ? (<span className="text-indigo-600 font-bold">{getDescriptiveGrade(g)}</span>) : g || ''))}
                              </td>
                            );
                          })}
                          <td className={\`p-1 text-center text-[10px] font-bold border border-black \${fin >= 75 ? 'text-emerald-700' : 'text-rose-700'} bg-slate-50/30\`}>{useDescriptiveGrading && isGrade1To3 && fin ? getDescriptiveGrade(fin) : fin || ''}</td>
                        </React.Fragment>
                      );
                    })}`;
const updated = code.split(search).join(replace);
if (code === updated) { console.log('not found'); } else { fs.writeFileSync('src/App.tsx', updated); console.log('success'); }
