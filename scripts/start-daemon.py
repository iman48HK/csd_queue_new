#!/usr/bin/env python3
"""Detach a Java process on macOS/Linux (setsid when forked)."""
import os
import sys


def main() -> int:
    if len(sys.argv) != 4:
        print("usage: start-daemon.py <jar> <log-file> <pid-file>", file=sys.stderr)
        return 1

    jar, log_file, pid_file = sys.argv[1:4]
    project_dir = os.getcwd()

    child = os.fork()
    if child > 0:
        with open(pid_file, "w", encoding="utf-8") as handle:
            handle.write(str(child))
        return 0

    os.setsid()
    os.chdir(project_dir)

    with open(log_file, "a", encoding="utf-8") as log:
        os.dup2(log.fileno(), 1)
        os.dup2(log.fileno(), 2)

    os.execvp("java", ["java", "-Duser.timezone=Asia/Hong_Kong", "-jar", jar])


if __name__ == "__main__":
    raise SystemExit(main())
