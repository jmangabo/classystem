const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const counts = {
  App: (content.match(/function App\(\)/g) || []).length,
  SectionForm: (content.match(/function SectionForm/g) || []).length,
  LoginView: (content.match(/function LoginView/g) || []).length
};
console.log(counts);
