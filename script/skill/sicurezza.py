"""Static review of pinned installation units; no skill code is executed.

The repository tree discovers SKILL.md units. Only a selected skill directory
is downloaded and scanned. The root README is evidence, not installed code.
Markdown instructions produce warnings; dangerous executable code blocks.
"""
import argparse
import concurrent.futures
import hashlib
import io
import json
import pathlib
import posixpath
import re
import stat
import urllib.request
import zipfile

VERSION = '3-scoped'
CHECKS = {
    'download-and-execute': r'(?:curl|wget)[^\n]{0,500}\|\s*(?:ba|z|fi)?sh\b|(?:iwr|irm|Invoke-WebRequest|Invoke-RestMethod)[^\n]{0,300}\|\s*(?:iex|Invoke-Expression)|\b(?:iex|Invoke-Expression)\s*\(',
    'remote-eval': r'\b(?:eval|exec|Function)\s*\([^\n]{0,300}(?:fetch|requests\.|https?://|urlopen)|\beval\s*\(\s*(?:atob|base64)',
    'obfuscation': r'[A-Za-z0-9+/]{300,}={0,2}|(?:\\x[0-9a-fA-F]{2}){24,}',
    'sensitive-read': r'(?:readFile(?:Sync)?|open|cat|Get-Content|read_text|read_bytes)[^\n]{0,160}(?:\.ssh[/\\]|\.env\b|[Cc]ookies|[Ll]ogin [Dd]ata|credentials|[Tt][Oo][Kk][Ee][Nn])|(?:~|HOME|USERPROFILE)[^\n]{0,60}\.ssh|os\.environ\[[^\n]*(?:TOKEN|SECRET|KEY)|process\.env\.(?:\w*(?:TOKEN|SECRET|KEY))',
    'external-data-send': r'(?:curl|wget)[^\n]{0,300}(?:--data|-d\s|--upload-file|-T\s)[^\n]{0,300}https?://|(?:requests|httpx)\.post\s*\(|\bfetch\s*\([^\n]{0,300}https?://[^\n]{0,300}(?:POST|body)|\bsendBeacon\s*\(|\b(?:upload|exfiltrat)\w*[^\n]{0,100}(?:token|credential|secret|cookie)',
    'postinstall': r'"(?:preinstall|postinstall|prepare)"\s*:',
    'remote-code-load': r'<script\b[^>]*\bsrc=["\']https?://|\bimport\s*\(["\']https?://',
    'environment-secret-read': r'os\.environ\.get\s*\([^\n]*(?:TOKEN|SECRET|KEY)|\$(?:env:)?[A-Z_]*(?:TOKEN|SECRET|API_KEY|PASSWORD)\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
    'multiline-data-send': r'\bfetch\s*\([\s\S]{0,600}?method\s*:\s*["\']POST["\'][\s\S]{0,600}?body\s*:|https?://[^\s"\']{0,180}[?&][^\s"\']{0,80}=\$\{?\w*(?:TOKEN|SECRET|KEY)',
}

RASTER = {'.png': b'\x89PNG\r\n\x1a\n', '.jpg': b'\xff\xd8\xff', '.jpeg': b'\xff\xd8\xff', '.gif': b'GIF8', '.webp': b'RIFF'}
BINARY = {'.exe', '.dll', '.so', '.dylib', '.bin', '.wasm', '.msi', '.com', '.scr', '.jar', '.pyc', '.zip', '.gz'}
DOC = {'.md', '.mdx', '.rst', '.txt'}
IGNORE = {'test', 'tests', '__tests__', 'fixtures', '.github', '.git', 'node_modules'}


def inside(name, root):
    return root == '.' or name == root or name.startswith(root + '/')


def scan_unit(files, skill_path):
    root = posixpath.dirname(skill_path) or '.'
    errors, warnings, texts, images, manifest = [], [], {}, {}, []
    def finding(file, reason, line=1):
        return {'file': file, 'line': line, 'reason': reason}
    selected = {n: v for n, v in files.items() if inside(n, root)}
    # Documentation declares service hosts; executable occurrences alone cannot
    # declare themselves. This permits documented APIs but still blocks unknown hosts.
    docs = '\n'.join(raw.decode('utf-8', errors='replace') for n, (raw, _) in selected.items() if pathlib.PurePosixPath(n).suffix.lower() in DOC)
    hosts = set(re.findall(r'https?://([a-zA-Z0-9.-]+)', docs))
    total = 0
    for name, (raw, mode) in selected.items():
        rel = posixpath.relpath(name, root)
        if name.startswith('/') or '\\' in name or '..' in pathlib.PurePosixPath(name).parts:
            errors.append(finding(name, 'unsafe-path')); continue
        if stat.S_ISLNK(mode):
            target = raw.decode('utf-8', errors='replace').strip()
            resolved = posixpath.normpath(posixpath.join(posixpath.dirname(name), target))
            if target.startswith('/') or '\\' in target or not inside(resolved, root) or resolved.startswith('../'):
                errors.append(finding(name, 'symlink-outside-skill')); continue
            if resolved not in selected:
                errors.append(finding(name, 'symlink-target-missing-scan-incomplete')); continue
            # The target is also in this scope and receives its own scan.
            manifest.append({'file':name,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'symlink':target})
            continue
        total += len(raw)
        if len(raw)>2_000_000 or total>40_000_000:
            errors.append(finding(name, 'size-limit-scan-incomplete')); continue
        manifest.append({'file':name,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)})
        suffix = pathlib.PurePosixPath(name).suffix.lower()
        if suffix in RASTER and raw.startswith(RASTER[suffix]) and (suffix!='.webp' or raw[8:12]==b'WEBP'):
            images[name] = manifest[-1]; continue
        if suffix in BINARY or raw[:2]==b'MZ' or raw[:4]==b'\x7fELF':
            errors.append(finding(name, 'opaque-binary')); continue
        try:
            text=raw.decode('utf-8-sig')
            if '\x00' in text: raise UnicodeError()
        except UnicodeError:
            errors.append(finding(name, 'opaque-binary')); continue
        texts[name]=text
        documentary = suffix in DOC
        if documentary:
            for match in re.finditer(r'\b(?:npx\s+skills\s+add|pip\s+install|npm\s+install)\b|(?:install instructions|install the .{0,30}CLI)',text,re.I):
                warnings.append(finding(name,'documented-installer',text[:match.start()].count('\n')+1))
        for reason, pattern in CHECKS.items():
            for match in list(re.finditer(pattern, text, re.I))[:5]:
                line=text[:match.start()].count('\n')+1
                hit=finding(name, reason, line)
                if documentary:
                    warnings.append(hit)
                else:
                    errors.append(hit)
        # Ordinary eval/exec, code fetched into a temporary file, dynamic requires,
        # and decoded shell execution cannot evade the single-line patterns.
        if not documentary:
            for reason, pattern in {
                'dynamic-evaluation':r'\b(?:eval|exec|Function)\s*\(',
                'download-and-execute':r'(?:curl|wget|urlretrieve|download)[\s\S]{0,700}?(?:\b(?:bash|sh|python|node|chmod)\b|subprocess\.|os\.system)',
            }.items():
                m=re.search(pattern,text,re.I)
                if m: errors.append(finding(name,reason,text[:m.start()].count('\n')+1))
            network=bool(re.search(r'\b(?:fetch|requests\.|httpx\.|curl|wget|urlopen|https?\.(?:request|post|get))',text))
            if network:
                for m in re.finditer(r'https?://([a-zA-Z0-9.-]+)',text):
                    if m[1] not in hosts:
                        errors.append(finding(name,'undocumented-network-host',text[:m.start()].count('\n')+1))
                    else:
                        warnings.append(finding(name,'documented-service-api',text[:m.start()].count('\n')+1))
    # Outbound API requests to documented service hosts are warnings unless they
    # read secrets/files: credentials and exfiltration never become an API warning.
    risky_reads=any(e['reason'] in {'sensitive-read','environment-secret-read'} for e in errors)
    if not risky_reads:
        for e in errors[:]:
            if e['reason'] in {'external-data-send','multiline-data-send'}:
                text=texts.get(e['file'],'')
                destinations=set(re.findall(r'https?://([a-zA-Z0-9.-]+)',text))
                if destinations and destinations.issubset(hosts):
                    errors.remove(e); warnings.append({**e,'reason':'documented-service-api'})
    if skill_path not in texts:
        errors.append(finding(skill_path,'missing-SKILL.md'))
    unique=lambda items:list({(e['file'],e['line'],e['reason']):e for e in items}.values())
    errors,warnings=unique(errors),unique(warnings)
    return {'version':VERSION,'skillPath':skill_path,'scope':root,'passed':not errors,'status':'blocked' if errors else 'warning' if warnings else 'passed',
            'complete':not any('incomplete' in e['reason'] for e in errors),'checked':list(CHECKS)+['all-files','installation-scope','symlinks','size-limits'],
            'files':len(manifest),'bytes':total,'errors':errors,'warnings':warnings,'manifest':manifest,'texts':texts,'images':images}


def scan(data, skill_path='SKILL.md'):
    files={}
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        for entry in archive.infolist():
            if entry.is_dir(): continue
            name='/'.join(entry.filename.split('/')[1:])
            files[name]=(archive.read(entry),entry.external_attr>>16)
    return scan_unit(files,skill_path)


def from_inventory(inv):
    entries=inv['entries']
    if len(entries)>12000: raise ValueError('installation scope exceeds file count; scan incomplete')
    if sum(e.get('size',0) for e in entries)>60_000_000: raise ValueError('installation scope exceeds byte limit; scan incomplete')
    def download(entry):
        url=f"https://raw.githubusercontent.com/{inv['repository']}/{inv['commit']}/{entry['path']}"
        with urllib.request.urlopen(url,timeout=45) as response:
            raw=response.read(2_000_001)
        # A failed fetch fails the review, not a partial passing unit.
        return entry['path'],(raw,int(entry['mode'],8))
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        files=dict(pool.map(download,entries))
    evidence={n:raw.decode('utf-8-sig') for n,(raw,_) in files.items() if re.fullmatch(r'readme\.md',n,re.I)}
    units=[scan_unit(files,p) for p in inv['paths']]
    return {'version':VERSION,'complete':True,'units':units,'evidence':evidence,'discovered':inv['paths']}


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('repository');parser.add_argument('commit');parser.add_argument('output');parser.add_argument('--inventory',required=True)
    args=parser.parse_args()
    if not re.fullmatch(r'[\w.-]+/[\w.-]+',args.repository) or not re.fullmatch(r'[a-f0-9]{40}',args.commit):
        raise SystemExit('invalid repository or commit')
    try:
        result=from_inventory(json.loads(pathlib.Path(args.inventory).read_text(encoding='utf-8')))
        result.update(repository=args.repository,commit=args.commit)
    except Exception as error:
        result={'complete':False,'units':[],'errors':[{'reason':str(error),'line':1}]}
    pathlib.Path(args.output).parent.mkdir(parents=True,exist_ok=True)
    pathlib.Path(args.output).write_text(json.dumps(result,ensure_ascii=False),encoding='utf-8')
    print(json.dumps({'units':len(result['units']),'complete':result['complete'],'errors':result.get('errors',[])}))
