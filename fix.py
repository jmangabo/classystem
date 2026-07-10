import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Replace the one inside SectionsView's return statement
content = re.sub(
    r'(<AralMasterData[^>]*?)onCreateAralClass=\{handleCreateAralClass\}',
    r'\1onCreateAralClass={onCreateAralClass}',
    content,
    flags=re.DOTALL
)
content = re.sub(
    r'(<AralMasterData[^>]*?)onUpdateAralClass=\{handleUpdateAralClass\}',
    r'\1onUpdateAralClass={onUpdateAralClass}',
    content,
    flags=re.DOTALL
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
