const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regexModalAdmin = /\} else if \(user\?\.role === 'admin'\) \{\s*actionToTake = 'request';\s*\}/g;

const replacementModalAdmin = `} else if (user?.role === 'admin') {
                               if (sectionToDelete.deletionStatus === 'approved' || isSectionEmpty) {
                                 actionToTake = 'delete';
                               } else {
                                 actionToTake = 'request';
                               }
                            }`;

code = code.replace(regexModalAdmin, replacementModalAdmin);

const regexButtonText = /: \(user\?\.role === 'teacher' && \(sectionToDelete\.deletionStatus === 'approved' \|\| isSectionEmpty\) \? 'Yes, Delete Permanently' : 'Request Deletion'\)\}/g;

const replacementButtonText = `: ((user?.role === 'teacher' || user?.role === 'admin') && (sectionToDelete.deletionStatus === 'approved' || isSectionEmpty) ? 'Yes, Delete Permanently' : 'Request Deletion')}`;

code = code.replace(regexButtonText, replacementButtonText);

const regexAppAdminDelete = /\} else if \(userProfile\?\.role === 'admin'\) \{\s*if \(action === 'request'\) \{/g;

const replacementAppAdminDelete = `} else if (userProfile?.role === 'admin') {
       if (action === 'delete' || (!action && section?.deletionStatus === 'approved')) {
           await cascadeDeleteSection(id);
       } else if (action === 'request') {`;

code = code.replace(regexAppAdminDelete, replacementAppAdminDelete);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed admin delete UI');
