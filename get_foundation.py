import re

with open("nexus-system-topology-with-security.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '"status": "foundation"' in line:
        for j in range(i-5, i):
            if '"id":' in lines[j]:
                print(lines[j].strip())
