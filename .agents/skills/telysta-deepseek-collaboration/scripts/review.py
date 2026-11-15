#!/usr/bin/env python3
"""Run a bounded review through the owner's Windows DSH desktop login."""
import argparse
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile


def windows_path(path):
    return subprocess.check_output(['wslpath', '-w', str(path)], text=True).strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--app', required=True, type=pathlib.Path)
    parser.add_argument('--task', required=True, type=pathlib.Path)
    parser.add_argument('--output', required=True, type=pathlib.Path)
    parser.add_argument('--timeout', type=int, default=240)
    parser.add_argument('files', nargs='+', type=pathlib.Path)
    args = parser.parse_args()
    root = pathlib.Path.cwd().resolve()
    output = args.output.resolve()
    if not output.is_relative_to(root / '.tmp'):
        parser.error('Keep reports/logs under the ignored project .tmp directory.')
    if not args.app.is_file() or not 10 <= args.timeout <= 600:
        parser.error('A desktop executable and a timeout between 10 and 600 seconds are required.')
    files = []
    for supplied in args.files:
        source = supplied.resolve()
        if not source.is_file() or not source.is_relative_to(root):
            parser.error(f'Not a project file: {supplied}')
        relative = source.relative_to(root)
        if any(part.startswith('.') for part in relative.parts) or any(
            token in source.name.lower() for token in ('secret', 'credential', 'private', '.env')
        ) or source.suffix.lower() not in ('.ts', '.tsx', '.js', '.mjs', '.css', '.scss', '.astro', '.html', '.md'):
            parser.error(f'Only explicitly reviewed public source/docs may be copied: {relative}')
        if source.stat().st_size > 200_000:
            parser.error(f'Keep delegation small: {relative}')
        files.append((source, relative))
    task = args.task.read_text(encoding='utf-8')
    # Derive AppData/Local from this desktop install, without reading account configuration.
    local_appdata = args.app.resolve().parents[2]
    directory = pathlib.Path(tempfile.mkdtemp(prefix='TelystaDSHReview-', dir=local_appdata / 'Temp'))
    for source, relative in files:
        target = directory / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    patch = [
        {'id': item, 'disabled': False}
        for item in ('credentials', 'authorization', 'deepseek-account')
    ] + [{'id': 'agent-default-model', 'name': '@deepseek-ai/dsh-agent-default-model',
          'config': {'provider': 'deepseek-account', 'model': 'deepseek-flash', 'reasoningEffort': 'high'}}]
    (directory / 'model.patch.json').write_text(json.dumps(patch), encoding='utf-8')
    cli = pathlib.PureWindowsPath(windows_path(args.app.resolve().parent)) / 'resources/app.asar/dsh/node_modules/@deepseek-ai/dsh-desktop-host/lib/cli.js'
    batch = directory / 'run-review.cmd'
    batch.write_text('@echo off\r\nset "ELECTRON_RUN_AS_NODE=1"\r\n"' + windows_path(args.app.resolve())
                     + '" --expose-internals "' + str(cli)
                     + '" --profile headless --patch "%~dp0model.patch.json" -\r\n', encoding='utf-8')
    prompt = ('Review only the explicitly supplied project files in this temporary workspace. '
              'Do not inspect files outside it, credentials, account settings, or network resources. '
              'Do not modify source files. Write your grounded findings to review.md in this workspace. '
              'Distinguish verified facts, inferences and recommendations.\n\n' + task)
    output.mkdir(parents=True, exist_ok=True)
    (output / 'workspace.txt').write_text(str(directory), encoding='utf-8')
    try:
        with (output / 'stdout.log').open('w') as stdout, (output / 'stderr.log').open('w') as stderr:
            result = subprocess.run(['/mnt/c/Windows/System32/cmd.exe', '/d', '/c', windows_path(batch)],
                                    input=prompt, cwd=directory, text=True, stdout=stdout, stderr=stderr,
                                    timeout=args.timeout)
    except subprocess.TimeoutExpired:
        print('DSH timed out; no completed review is claimed.', file=sys.stderr)
        return 1
    report = directory / 'review.md'
    if result.returncode != 0 or not report.is_file() or not report.stat().st_size:
        print(f'DSH did not complete a report (exit {result.returncode}); inspect private logs.', file=sys.stderr)
        return 1
    shutil.copyfile(report, output / 'review.md')
    print(f'DSH review completed: {output.relative_to(root) / "review.md"}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
