"""노션 Blog 데이터베이스의 Published 글을 _posts/ 마크다운으로 옮긴다.

환경변수: NOTION_TOKEN, NOTION_DATABASE_ID
데이터베이스 속성: Title(제목), Status(select 또는 status, 값 Published),
Date(날짜, 없으면 만든 날), Summary(글), Slug(글, 주소용 영문 — 없으면 제목에서 만듦)
노션에서 온 글은 front matter에 notion_id가 있고, Published가 아니게 되면 지운다.
"""
import json, os, re, sys, urllib.request, urllib.error, mimetypes, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POSTS = ROOT / "_posts"
MEDIA = ROOT / "media" / "blog" / "notion"
API = "https://api.notion.com/v1"
VERSION = "2022-06-28"


def call(path, body=None, method="GET"):
    req = urllib.request.Request(API + path, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": "Bearer " + os.environ["NOTION_TOKEN"],
                 "Notion-Version": VERSION, "Content-Type": "application/json"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (429, 502, 503) and attempt < 3:
                time.sleep(2 + attempt * 3)
                continue
            sys.exit(f"Notion API {e.code}: {e.read().decode()[:400]}")


def published_pages(db):
    pages, cursor = [], None
    while True:
        body = {"page_size": 100}
        if cursor:
            body["start_cursor"] = cursor
        res = call(f"/databases/{db}/query", body, "POST")
        pages += res["results"]
        if not res.get("has_more"):
            return [p for p in pages if status(p) == "published"]
        cursor = res["next_cursor"]


def prop(page, name):
    for k, v in page["properties"].items():
        if k.lower() == name.lower():
            return v
    return None


def status(page):
    p = prop(page, "Status")
    if not p:
        return ""
    v = p.get(p["type"])
    return (v or {}).get("name", "").lower() if isinstance(v, dict) else ""


def plain(rich):
    return "".join(t["plain_text"] for t in rich or [])


def text_prop(page, name):
    p = prop(page, name)
    if not p:
        return ""
    v = p.get(p["type"])
    return plain(v) if isinstance(v, list) else ""


def title_of(page):
    for v in page["properties"].values():
        if v["type"] == "title":
            return plain(v["title"]).strip()
    return "Untitled"


def date_of(page):
    p = prop(page, "Date")
    if p and p["type"] == "date" and p["date"]:
        return p["date"]["start"][:10]
    return page["created_time"][:10]


def slugify(s):
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s[:60].strip("-")


def children(block_id):
    out, cursor = [], None
    while True:
        q = "?page_size=100" + (f"&start_cursor={cursor}" if cursor else "")
        res = call(f"/blocks/{block_id}/children{q}")
        out += res["results"]
        if not res.get("has_more"):
            return out
        cursor = res["next_cursor"]


def inline(rich):
    out = ""
    for t in rich or []:
        s = t["plain_text"]
        if not s:
            continue
        a = t.get("annotations", {})
        if a.get("code"):
            s = f"`{s}`"
        else:
            s = re.sub(r"([\\*_\[\]<>|#])", r"\\\1", s)
            lead, core, trail = re.match(r"(\s*)(.*?)(\s*)$", s, re.S).groups()
            if core:
                if a.get("bold"):
                    core = f"**{core}**"
                if a.get("italic"):
                    core = f"*{core}*"
                if a.get("strikethrough"):
                    core = f"~~{core}~~"
            s = lead + core + trail
        if t.get("href"):
            s = f"[{s}]({t['href']})"
        out += s
    return out


def save_file(block_id, url):
    MEDIA.mkdir(parents=True, exist_ok=True)
    ext = Path(url.split("?")[0]).suffix.lower()
    if not re.fullmatch(r"\.[a-z0-9]{2,5}", ext):
        ext = ""
    for f in MEDIA.glob(block_id + ".*"):
        return f.name
    with urllib.request.urlopen(url, timeout=120) as r:
        data = r.read()
        if not ext:
            ext = mimetypes.guess_extension(r.headers.get_content_type() or "") or ".bin"
    name = block_id + ext
    (MEDIA / name).write_bytes(data)
    return name


def media_url(block, used):
    b = block[block["type"]]
    if b["type"] == "external":
        return b["external"]["url"]
    name = save_file(block["id"], b["file"]["url"])
    used.add(name)
    return f"/media/blog/notion/{name}"


def render(blocks, used, depth=0):
    lines, num = [], 0
    pad = "    " * depth
    for b in blocks:
        t = b["type"]
        d = b.get(t, {})
        kids = render(children(b["id"]), used, depth + 1) if b.get("has_children") and t not in ("child_page", "child_database") else ""
        num = num + 1 if t == "numbered_list_item" else 0
        if t == "paragraph":
            lines.append(pad + inline(d["rich_text"]) + "\n")
        elif t in ("heading_1", "heading_2", "heading_3"):
            # 글 제목이 h1이라 본문 제목은 한 단계 내림
            lines.append("#" * (int(t[-1]) + 1) + " " + inline(d["rich_text"]) + "\n")
        elif t == "bulleted_list_item":
            lines.append(pad + "- " + inline(d["rich_text"]))
        elif t == "numbered_list_item":
            lines.append(pad + f"{num}. " + inline(d["rich_text"]))
        elif t == "to_do":
            lines.append(pad + ("- [x] " if d.get("checked") else "- [ ] ") + inline(d["rich_text"]))
        elif t in ("quote", "callout"):
            icon = (d.get("icon") or {}).get("emoji", "") + " " if t == "callout" else ""
            body = (icon + inline(d["rich_text"])).strip()
            lines.append("\n".join("> " + l for l in body.split("\n")) + "\n")
        elif t == "code":
            lines.append(f"```{d.get('language', '')}\n{plain(d['rich_text'])}\n```\n")
        elif t == "divider":
            lines.append("---\n")
        elif t == "image":
            cap = plain(d.get("caption"))
            lines.append(f"![{cap}]({media_url(b, used)})" + (f"\n*{inline(d['caption'])}*" if cap else "") + "\n")
        elif t == "video":
            url = media_url(b, used)
            if url.startswith("/media/"):
                lines.append(f'<video src="{url}" controls playsinline></video>\n')
            else:
                lines.append(f"[{url}]({url})\n")
        elif t in ("bookmark", "embed", "link_preview"):
            url = d.get("url", "")
            lines.append(f"[{plain(d.get('caption')) or url}]({url})\n")
        elif t == "toggle":
            lines.append(pad + "**" + inline(d["rich_text"]) + "**\n")
        elif t == "equation":
            lines.append(f"`{d.get('expression', '')}`\n")
        if kids:
            if t in ("quote", "callout"):
                lines.append("\n".join("> " + l if l else ">" for l in kids.rstrip().split("\n")) + "\n")
            else:
                lines.append(kids)
        # 목록이 끝나면 빈 줄
        if t in ("bulleted_list_item", "numbered_list_item", "to_do") and depth == 0:
            nxt = blocks[blocks.index(b) + 1]["type"] if b is not blocks[-1] else None
            if nxt not in ("bulleted_list_item", "numbered_list_item", "to_do"):
                lines.append("")
    return "\n".join(lines) + ("\n" if lines else "")


def yaml_str(s):
    return json.dumps(s, ensure_ascii=False)


def existing():
    found = {}
    for f in POSTS.glob("*.md"):
        m = re.search(r"^notion_id:\s*(\S+)", f.read_text(encoding="utf-8"), re.M)
        if m:
            found[m.group(1)] = f
    return found


def main():
    if not os.environ.get("NOTION_TOKEN") or not os.environ.get("NOTION_DATABASE_ID"):
        print("NOTION_TOKEN / NOTION_DATABASE_ID 없음 — 건너뜀")
        return
    db = os.environ["NOTION_DATABASE_ID"].replace("-", "")
    db = re.search(r"[0-9a-f]{32}", db).group(0)
    POSTS.mkdir(exist_ok=True)
    old = existing()
    used, keep = set(), set()
    for page in published_pages(db):
        pid = page["id"].replace("-", "")
        title = title_of(page)
        slug = slugify(text_prop(page, "Slug")) or slugify(title) or pid[:8]
        name = f"{date_of(page)}-{slug}.md"
        body = render(children(page["id"]), used).strip()
        summary = text_prop(page, "Summary").strip()
        front = ["---", f"title: {yaml_str(title)}"]
        if summary:
            front.append(f"summary: {yaml_str(summary)}")
        front += [f"notion_id: {pid}", "---", ""]
        text = "\n".join(front) + "{% raw %}\n" + body + "\n{% endraw %}\n"
        path = POSTS / name
        if pid in old and old[pid] != path:
            old[pid].unlink()
        if not path.exists() or path.read_text(encoding="utf-8") != text:
            path.write_text(text, encoding="utf-8")
            print("updated", name)
        keep.add(pid)
    for pid, f in old.items():
        if pid not in keep and f.exists():
            f.unlink()
            print("removed", f.name)
    if MEDIA.exists():
        refs = "".join(f.read_text(encoding="utf-8") for f in POSTS.glob("*.md"))
        for f in MEDIA.iterdir():
            if f.name not in refs:
                f.unlink()


if __name__ == "__main__":
    main()
