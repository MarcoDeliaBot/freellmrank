"""Scan every member of a pinned GitHub ZIP without extracting or executing it.

Conservative publishing gate, not a security guarantee. Unknown/oversized files,
symlinks and an incomplete scan fail closed. Only inert raster images are allowed
as binary documentation assets; executables, archives and other opaque files fail.
"""
import argparse
import hashlib
import io
import json
import pathlib
import re
import stat
import urllib.request
import zipfile

VERSION = '1'
CHECKS = {
    'download-and-execute': r'(?:curl|wget)[^\n]{0,500}\|\s*(?:ba|z|fi)?sh\b|(?:iwr|irm|Invoke-WebRequest|Invoke-RestMethod)[^\n]{0,300}\|\s*(?:iex|Invoke-Expression)|\b(?:iex|Invoke-Expression)\s*\(',
    'remote-eval': r'\b(?:eval|exec|Function)\s*\([^\n]{0,300}(?:fetch|requests\.|https?://|urlopen)|\beval\s*\(\s*(?:atob|base64)',
    'obfuscation': r'[A-Za-z0-9+/]{300,}={0,2}|(?:\\x[0-9a-fA-F]{2}){24,}',
    'sensitive-read': r'(?:readFile(?:Sync)?|open|cat|Get-Content|read_text|read_bytes)[^\n]{0,160}(?:\.ssh[/\\]|\.env\b|[Cc]ookies|[Ll]ogin [Dd]ata|credentials|[Tt][Oo][Kk][Ee][Nn])|(?:~|HOME|USERPROFILE)[^\n]{0,60}\.ssh|os\.environ\[[^\n]*(?:TOKEN|SECRET|KEY)|process\.env\.(?:\w*(?:TOKEN|SECRET|KEY))',
    'external-data-send': r'(?:curl|wget)[^\n]{0,300}(?:--data|-d\s|--upload-file|-T\s)[^\n]{0,300}https?://|(?:requests|httpx)\.post\s*\(|\bfetch\s*\([^\n]{0,300}https?://[^\n]{0,300}(?:POST|body)|\bsendBeacon\s*\(|\b(?:upload|exfiltrat)\w*[^\n]{0,100}(?:token|credential|secret|cookie)',
    'postinstall': r'"(?:preinstall|postinstall|prepare)"\s*:',
}
RASTER = {'.png': b'\x89PNG\r\n\x1a\n', '.jpg': b'\xff\xd8\xff', '.jpeg': b'\xff\xd8\xff', '.gif': b'GIF8', '.webp': b'RIFF'}
EXEC = {'.exe', '.dll', '.so', '.dylib', '.bin', '.wasm', '.msi', '.com', '.scr', '.jar', '.pyc', '.zip', '.gz', '.woff', '.woff2', '.ttf', '.otf', '.pdf'}


def scan(data):
    errors, texts, images, manifest = [], {}, {}, []
    total = 0
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        members = archive.infolist()
        if len(members) > 8000:
            raise ValueError('repository exceeds 8000 files; scan incomplete')
        for entry in members:
            if entry.is_dir():
                continue
            name = '/'.join(entry.filename.split('/')[1:])
            p = pathlib.PurePosixPath(name)
            if not name or p.is_absolute() or '..' in p.parts or '\\' in name or stat.S_ISLNK(entry.external_attr >> 16):
                errors.append({'file': name, 'reason': 'unsafe-path-or-symlink'})
                continue
            total += entry.file_size
            if entry.file_size > 2_000_000 or total > 40_000_000:
                errors.append({'file': name, 'reason': 'size-limit-scan-incomplete'})
                continue
            raw = archive.read(entry)
            manifest.append({'file': name, 'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw)})
            suffix = p.suffix.lower()
            if suffix in EXEC or raw[:2] == b'MZ' or raw[:4] == b'\x7fELF':
                errors.append({'file': name, 'reason': 'binary-or-executable'})
                continue
            if suffix in RASTER and raw.startswith(RASTER[suffix]):
                images[name] = {'bytes': len(raw), 'sha256': manifest[-1]['sha256']}
                continue
            try:
                text = raw.decode('utf-8-sig')
                if '\x00' in text:
                    raise UnicodeError()
            except UnicodeError:
                errors.append({'file': name, 'reason': 'opaque-binary'})
                continue
            texts[name] = text
            for reason, pattern in CHECKS.items():
                match = re.search(pattern, text, re.I)
                if match:
                    errors.append({'file': name, 'reason': reason, 'line': text[:match.start()].count('\n') + 1})
    if not any(pathlib.PurePosixPath(n).name == 'SKILL.md' for n in texts):
        errors.append({'file': '', 'reason': 'missing-SKILL.md'})
    return {'version': VERSION, 'passed': not errors, 'complete': not any('incomplete' in e['reason'] for e in errors),
            'checked': list(CHECKS) + ['all-files', 'binary-or-executable', 'symlinks', 'size-limits'],
            'files': len(manifest), 'bytes': total, 'errors': errors, 'manifest': manifest, 'texts': texts, 'images': images}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('repository')
    parser.add_argument('commit')
    parser.add_argument('output')
    args = parser.parse_args()
    if not re.fullmatch(r'[\w.-]+/[\w.-]+', args.repository) or not re.fullmatch(r'[a-f0-9]{40}', args.commit):
        raise SystemExit('invalid repository or commit')
    try:
        url = f'https://codeload.github.com/{args.repository}/zip/{args.commit}'
        with urllib.request.urlopen(url, timeout=90) as response:
            data = response.read(25_000_001)
        if len(data) > 25_000_000:
            raise ValueError('archive limit; scan incomplete')
        result = scan(data)
        result.update(repository=args.repository, commit=args.commit, archiveSha256=hashlib.sha256(data).hexdigest())
    except Exception as error:
        result = {'passed': False, 'complete': False, 'errors': [{'reason': str(error)}]}
    pathlib.Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    pathlib.Path(args.output).write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
    print(json.dumps({k: result.get(k) for k in ['passed', 'complete', 'files', 'errors']}))
