"""Publish the useful part of a failed CI step as GitHub error annotations.

Annotations are visible on the pull request and through the REST API, which
makes failures readable without downloading full job logs.

Usage: python3 annotate_failures.py <title> <file-or-glob> [<file-or-glob> ...]

Files are processed in the order given, so pass the most specific reports
first. Surefire reports (*.txt under surefire-reports) get a structured
summary: each failing test, its assertion message and the first frame in
the project's own code. Other files are filtered for error-looking lines,
including MockMvc's request/response dump for failing tests.
"""
import glob
import re
import sys

ANSI = re.compile(r"\x1b\[[0-9;]*m")
INTERESTING = re.compile(
    r"\[ERROR\]|ERROR|Exception|Caused by|FAILED|Tests run:.*(Failures: [1-9]|Errors: [1-9])|"
    r"expected|but was|AssertionError|Error:|✘|at com\.example|BUILD FAILURE|Could not|cannot find symbol|"
    r"symbol:|location:|incompatible types|Locator|Received|Expected|"
    r"^\s*(HTTP Method|Request URI|Status|Body) ="
)
# Lines that legitimately repeat and must not be de-duplicated.
REPEATABLE = re.compile(r"^\s*(HTTP Method|Request URI|Status|Body) =")
TEST_FAILURE = re.compile(r"<<< (FAILURE|ERROR)!")
MAX_ANNOTATIONS = 10
CHUNK = 3800


def escape(text):
    return text.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")


def read(path):
    try:
        with open(path, encoding="utf-8", errors="replace") as handle:
            return [ANSI.sub("", line.rstrip()) for line in handle]
    except OSError:
        return []


def surefire_summary(content):
    """Failing test name, its message lines and the first project frame."""
    picked = []
    index = 0
    while index < len(content):
        line = content[index]
        if TEST_FAILURE.search(line) and not line.startswith("Tests run:"):
            picked.append(line)
            index += 1
            message_lines = 0
            project_frame = None
            while index < len(content) and not TEST_FAILURE.search(content[index]):
                current = content[index]
                stripped = current.strip()
                if stripped.startswith("at "):
                    if project_frame is None and "com.example" in stripped:
                        project_frame = current
                elif stripped and message_lines < 12:
                    picked.append(current)
                    message_lines += 1
                index += 1
            if project_frame:
                picked.append(project_frame)
            continue
        index += 1
    return picked


def main():
    title = sys.argv[1]
    lines = []
    for pattern in sys.argv[2:]:
        for path in sorted(glob.glob(pattern)):
            content = read(path)
            if "surefire-reports" in path:
                picked = surefire_summary(content)
            else:
                picked = [line for line in content if INTERESTING.search(line)]
            if picked:
                lines.append(f"== {path}")
                lines.extend(picked)

    seen = set()
    unique = []
    for line in lines:
        key = line.strip()
        if not key:
            continue
        if REPEATABLE.search(line):
            unique.append(line[:500])
        elif key not in seen:
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
