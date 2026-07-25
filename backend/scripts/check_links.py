import os, re
html_files = [os.path.join(r, f) for r, d, files in os.walk('c:/Users/asus/UNISPREP 2/frontend') for f in files if f.endswith('.html')]
broken_found = False
for file in html_files:
    content = open(file, 'r', encoding='utf-8').read()
    links = re.findall(r'href=[\'\"]([^\'\"]+)[\'\"]', content)
    for link in links:
        if link.startswith('http'): continue
        if link.startswith('#'): continue
        if link.startswith('mailto:'): continue
        if link.startswith('tel:'): continue
        if link.startswith('/'): link = link[1:]
        path = link.split('?')[0].split('#')[0]
        if not path: continue
        full_path = os.path.join('c:/Users/asus/UNISPREP 2/frontend', path)
        if not os.path.exists(full_path):
            print(f'Broken link in {os.path.basename(file)}: {link}')
            broken_found = True

if not broken_found:
    print("No broken links found!")
