#!/usr/bin/env python3
"""
Tests for tools/acidome_height.py, the Acidome Height+ patch.

They need your own offline Acidome copy at vendor/acidome/acidome-offline.html (git-ignored, not
part of the repository) and are skipped without it. They check that every edit applies to it,
that a patched file is refused, and that a changed Acidome version fails with a clear message.

Run with:  python3 tests/test_acidome_height.py   (or pytest tests/)
"""

import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'vendor' / 'acidome' / 'acidome-offline.html'

spec = importlib.util.spec_from_file_location('acidome_height', ROOT / 'tools' / 'acidome_height.py')
acidome_height = importlib.util.module_from_spec(spec)
spec.loader.exec_module(acidome_height)

try:
    import pytest
    needs_source = pytest.mark.skipif(not SOURCE.exists(), reason='no offline Acidome copy in vendor/acidome/')
except ImportError:  # plain-script run
    def needs_source(fn):
        return fn


def _expect_exit(fn, *args):
    try:
        fn(*args)
    except SystemExit as e:
        return str(e)
    raise AssertionError('expected the patch to stop')


@needs_source
def test_every_edit_applies():
    out = acidome_height.patch(SOURCE.read_text(encoding='utf-8'))
    for desc, old, new in acidome_height.EDITS:
        assert new in out, desc
    assert out.count(acidome_height.JOINT_NEW) == acidome_height.JOINT_COUNT
    for name in ('domezShape', 'domezOpening', 'domezSetParam', 'domez-height', 'domez-egg', 'domez-gap', "name: 'height plus'"):
        assert name in out, name


@needs_source
def test_patched_file_is_refused():
    out = acidome_height.patch(SOURCE.read_text(encoding='utf-8'))
    assert 'already patched' in _expect_exit(acidome_height.patch, out)


@needs_source
def test_changed_acidome_fails_clearly():
    text = SOURCE.read_text(encoding='utf-8').replace("name: 'flat base'", "name: 'flat-base'")
    assert 'shape stage' in _expect_exit(acidome_height.patch, text)


def run_all_tests():
    if not SOURCE.exists():
        print(f'SKIP: {SOURCE.relative_to(ROOT)} not found (download "Acidome offline" from acidome.com)')
        return True
    tests = [test_every_edit_applies, test_patched_file_is_refused, test_changed_acidome_fails_clearly]
    failed = 0
    for test in tests:
        try:
            test()
            print(f'  ✓ PASS {test.__name__}')
        except AssertionError as e:
            failed += 1
            print(f'  ✗ FAIL {test.__name__}: {e}')
    print(f'OVERALL: {len(tests) - failed}/{len(tests)} tests passed')
    return failed == 0


if __name__ == '__main__':
    sys.exit(0 if run_all_tests() else 1)
