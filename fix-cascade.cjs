const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const cascadeFunc = `  const cascadeDeleteSection = async (id: string) => {
    try {
      const batch = writeBatch(db);
      
      const studentsSnap = await getDocs(collection(db, \`sections/\${id}/students\`));
      studentsSnap.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      const subjectsSnap = await getDocs(collection(db, \`sections/\${id}/subjects\`));
      subjectsSnap.forEach(doc => {
        batch.delete(doc.ref);
      });

      batch.delete(doc(db, "sections", id));
      
      await batch.commit();
    } catch (error) {
       handleFirestoreError(error, 'delete', \`sections/\${id}\`);
       throw error;
    }
  };

  const handleDeleteSection = async (id: string, action?: 'approve' | 'disapprove' | 'cancel' | 'request' | 'delete', reason?: string) => {`;

code = code.replace(/  const handleDeleteSection = async \(id: string, action\?: 'approve' \| 'disapprove' \| 'cancel' \| 'request' \| 'delete', reason\?: string\) => \{/g, cascadeFunc);

code = code.replace(/await deleteDoc\(doc\(db, "sections", id\)\);/g, "await cascadeDeleteSection(id);");

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed cascade delete');
