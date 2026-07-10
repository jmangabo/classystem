import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Fix AralMasterData inside SectionsView
def repl(m):
    s = m.group(0)
    s = s.replace('onCreateAralClass={handleCreateAralClass}', 'onCreateAralClass={onCreateAralClass}')
    s = s.replace('onUpdateAralClass={handleUpdateAralClass}', 'onUpdateAralClass={onUpdateAralClass}')
    return s

content = re.sub(r'<AralMasterData[^>]*>', repl, content)

# Fix SectionsView inside App
def repl2(m):
    s = m.group(0)
    s = s.replace('onCreateAralClass={onCreateAralClass}', 'onCreateAralClass={handleCreateAralClass}')
    s = s.replace('onUpdateAralClass={onUpdateAralClass}', 'onUpdateAralClass={handleUpdateAralClass}')
    return s

content = re.sub(r'<SectionsView[^>]*>', repl2, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
