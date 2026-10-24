"""Publish the useful part of a failed CI step as GitHub error annotations.

Annotations are visible on the pull request and through the REST API, which
makes failures readable without downloading full job logs.

Usage: python3 annotate_failures.py <title> <file-or-glob> [<file-or-glob> ...]
"""
import glob
import re
import sys

ANSI = re.compile(r"\x1b\[[0-9;]*m")
INTERESTING = re.compile(
    r"\[ERROR\]|ERROR|Exception|Caused by|FAILED|Tests run:.*(Failures: [1-9]|Errors: [1-9])|"
    r"expected|but was|AssertionError|Error:|✘|at com\.example|BUILD FAILURE|Could not|cannot find symbol|"
    r"symbol:|location:|incompatible types|Locator|Received|Expected"
)
MAX_ANNOTATIONS = 10
CHUNK = 3800


def escape(text):
    return text.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")


def main():
    title = sys.argv[1]
    lines = []
    for pattern in sys.argv[2:]:
        for path in sorted(glob.glob(pattern)):
            try:
                with open(path, encoding="utf-8", errors="replace") as handle:
                    content = [ANSI.sub("", line.rstrip()) for line in handle]
            except OSError:
                continue
            picked = [line for line in content if INTERESTING.search(line)]
            if picked:
                lines.append(f"== {path}")
                lines.extend(picked)

    seen = set()
    unique = []
    for line in lines:
        key = line.strip()
        if key and key not in seen:
            seen.add(key)
            unique.append(line[:600])

    chunks, current = [], ""
    for line in unique:
        if len(current) + len(line) + 1 > CHUNK:
            chunks.append(current)
            current = ""
        current += line + "\n"
    if current:
        chunks.append(current)

    if not chunks:
        print(f"::error title={title}::No error lines found in {' '.join(sys.argv[2:])}")
    for index, chunk in enumerate(chunks[:MAX_ANNOTATIONS], start=1):
        print(f"::error title={title} ({index}/{min(len(chunks), MAX_ANNOTATIONS)})::{escape(chunk)}")


if __name__ == "__main__":
    main()
