path = "src/app/probabilisticas/page.tsx"
with open(path, "r", encoding="utf-8", newline=None) as f:
    s = f.read()
s_norm = s.replace("\r\n", "\n").replace("\r", "\n")
i = s_norm.find('href="/admin"')
if i < 0:
    print("Not found")
else:
    # Find start of this Link tag (go back to previous newline + spaces)
    start = s_norm.rfind("\n", 0, i)
    if start < 0:
        start = 0
    # Find end: </Link>
    end = s_norm.find("</Link>", i) + len("</Link>")
    old_block = s_norm[start:end]
    # Build new block: same leading whitespace as the line with <Link>
    line_start = s_norm.rfind("\n", 0, start) + 1
    leading = s_norm[line_start:start]
    new_block = leading + "{isAdmin && (\n" + leading + "  <Link\n" + leading + "    href=\"/admin\"\n" + leading + "    className=\"px-3 py-2 rounded-lg text-xs font-medium border border-[#374151] text-[#93C5FD] hover:bg-[#1E293B] transition-colors\"\n" + leading + "  >\n" + leading + "    Admin\n" + leading + "  </Link>\n" + leading + ")}"
    new_s = s_norm[:start] + new_block + s_norm[end:]
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(new_s)
    print("Replaced OK")
