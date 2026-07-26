import os
import glob

base = 'https://unisprep-bach.onrender.com'
files = glob.glob('c:/Users/asus/UNISPREP 2/frontend/**/*.html', recursive=True) + glob.glob('c:/Users/asus/UNISPREP 2/frontend/**/*.js', recursive=True)

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    new_content = content.replace("'/api/", f"'{base}/api/")
    new_content = new_content.replace('"/api/', f'"{base}/api/')
    new_content = new_content.replace('`/api/', f'`{base}/api/')
    
    if new_content != content:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f'Updated {f}')
