"""Rebuild the publication inventory using the generators at each historical revision.

One mainline revision per UTC day, plus every change to inputs/generators within
that day: a daily sample alone misses short-lived URLs (notably slug collisions).
No checkout, network request or historical build is executed.
"""
import argparse
import io
import json
import pathlib
import subprocess
import tarfile

ROOT = pathlib.Path(__file__).resolve().parents[1]


def git(*args, binary=False):
    value = subprocess.check_output(['git', *args], cwd=ROOT)
    return value if binary else value.decode('utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ref', default='origin/main')
    parser.add_argument('--output', default='.ai/pagine-storia.json')
    args = parser.parse_args()
    if git('rev-parse', '--is-shallow-repository').strip() == 'true':
        raise RuntimeError('Complete Git history required: fetch --unshallow first')
    cache = ROOT / '.ai' / 'pagine-storia'
    cache.mkdir(parents=True, exist_ok=True)
    paths = ['sito/data.json', 'sito/dati.json', 'sito/history.json', 'sito/storia.json',
             'dati', 'contenuti', 'script/sito', 'script/cf-modelli.mjs',
             'sorgente',
             'traduzioni/pubblicate.json', 'script/traduci.mjs']
    # First-parent chronology excludes unmerged branches and repeated PR history.
    rows = git('log', args.ref, '--first-parent', '--reverse', '--format=%H %cs', '--', *paths).splitlines()
    snapshots, daily, signatures = [], {}, set()
    for row in rows:
        sha, day = row.split()
        daily[day] = sha
        tree = git('ls-tree', '-r', sha, '--', *paths)
        if 'script/sito/modelli.mjs' not in tree:
            continue
        # Identical input/code trees cannot introduce new pages.
        if tree in signatures:
            continue
        signatures.add(tree)
        dest = cache / sha
        result = dest / 'inventory.json'
        if not result.exists():
            dest.mkdir(exist_ok=True)
            members = [line.split('\t', 1)[1] for line in tree.splitlines()
                       if line.split('\t', 1)[1].endswith(('.mjs', '.json', '.md', '.jpg', '.png'))]
            archive = tarfile.open(fileobj=io.BytesIO(git('archive', sha, '--', *members, binary=True)))
            archive.extractall(dest, filter='data')
            runner = dest / 'inventory.mjs'
            runner.write_text('''import fs from 'node:fs';
import {unisci} from './script/sito/modelli.mjs';
import {preparaBlog} from './script/sito/blog.mjs';
const read=(a,b)=>JSON.parse(fs.readFileSync(fs.existsSync(a)?a:b,'utf8'));
const data=read(new URL('./sito/data.json',import.meta.url),new URL('./sito/dati.json',import.meta.url));
const history=read(new URL('./sito/history.json',import.meta.url),new URL('./sito/storia.json',import.meta.url));
const models=unisci(data,history);
const compare=fs.existsSync(new URL('./script/sito/confronti.mjs',import.meta.url))
 ? (await import('./script/sito/confronti.mjs')).preparaConfronti(models):[];
const blog=preparaBlog(data,history,models);
// No derived cross-links in snapshots; these are rebuilt against the current inventory.
for(const m of models)delete m.confronti;
const published=new URL('./traduzioni/pubblicate.json',import.meta.url);
fs.writeFileSync(new URL('./inventory.json',import.meta.url),JSON.stringify({
 date:data.aggiornato,models,compare:compare.map(c=>({url:c.href,a:c.a.href,b:c.b.href})),blog,
 languages:fs.existsSync(published)?JSON.parse(fs.readFileSync(published,'utf8')):{}
}));
''', encoding='utf-8')
            run = subprocess.run(['node', str(runner)], cwd=dest, capture_output=True)
            if run.returncode:
                raise RuntimeError(f'{sha}: {run.stderr.decode("utf-8")}')
        inventory = json.loads(result.read_text(encoding='utf-8'))
        data_file = dest / 'sito/data.json'
        if not data_file.exists():
            data_file = dest / 'sito/dati.json'
        source_data = json.loads(data_file.read_text(encoding='utf-8'))
        dates = {c['id']: c.get('data') for c in source_data['categorie']}
        for model in inventory['models']:
            for category, scores in model['cat'].items():
                scores['data'] = dates.get(category)
        snapshots.append({'commit': sha, 'day': day, **inventory})
        print(f'{day} {sha[:8]}: {len(inventory["models"])} models, '
              f'{len(inventory["compare"])} comparisons, {len(inventory["blog"])} articles', flush=True)
    output = ROOT / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({'ref': args.ref, 'head': git('rev-parse', args.ref).strip(),
                                 'daily': daily, 'snapshots': snapshots}, ensure_ascii=False), encoding='utf-8')
    print(f'Saved {len(snapshots)} observations over {len(daily)} days: {output}')


if __name__ == '__main__':
    main()
