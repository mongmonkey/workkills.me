# workkills.me

빌드 없는 정적 사이트: `index.html` · `style.css` · `favicon.svg`.

## 로컬 실행

```bash
cd ~/Downloads/workkills && python3 -m http.server 8137
```

→ http://127.0.0.1:8137

## 고칠 곳

- 문구: `index.html`의 `.sub` 두 줄과 워드마크 `#mark`(크기는 `main.js`가 화면 폭에 맞춤).
- 글꼴: Google Fonts의 Gloock(워드마크)·EB Garamond(서브 텍스트).
- 색: `style.css` 맨 위 `--bg`, `--ink`.

## 지금 배포 상태 (2026-10-29)

- GitHub Pages: 저장소 `mongmonkey/workkills.me`, `main` 브랜치 루트, 사용자 도메인 `workkills.me`(`CNAME` 파일).
- 고치고 올리기: `git add -A && git commit -m "…" && git push` → 1분쯤 뒤 반영.
- 도메인: GoDaddy. DNS 레코드
  - A `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (GoDaddy 기본 A 레코드는 삭제)
  - CNAME `www` → `mongmonkey.github.io`
- DNS가 잡히면 저장소 Settings → Pages에서 "Enforce HTTPS" 켜기.

## 다른 배포 방법 (Cloudflare Pages, 무료)

1. GitHub에 이 폴더를 새 저장소로 올린다 (또는 Cloudflare 대시보드에서 폴더를 직접 업로드 — "Upload assets").
2. Cloudflare 대시보드 → Workers & Pages → Create → Pages → 저장소 연결.
   빌드 명령 없음, 출력 폴더 `/`.
3. 배포되면 `xxx.pages.dev` 주소가 생긴다.
4. 프로젝트 → Custom domains → `workkills.me` 추가 (+ `www.workkills.me`도 추가하면 자동 리다이렉트 설정 가능).
   - 도메인 DNS가 Cloudflare에 있으면 레코드가 자동으로 만들어진다.
   - 다른 등록업체(가비아·Namecheap 등)에 있으면: 네임서버를 Cloudflare로 옮기거나,
     루트 도메인은 네임서버 이전이 필요하므로 이전을 권장. HTTPS는 자동.

### 대안

- **Vercel**: `npx vercel` (이 폴더에서) → 프로젝트 Settings → Domains → `workkills.me` 추가 →
  안내된 DNS 레코드(루트는 A `76.76.21.21`, www는 CNAME `cname.vercel-dns.com`)를 등록업체에 입력.
- **Netlify**: 폴더를 app.netlify.com/drop에 끌어다 놓기 → Domain settings에서 `workkills.me` 추가.
- **videokills.ai 서버(Caddy)에 같이 올리기**: `Caddyfile`에
  `workkills.me { root * /srv/workkills  file_server }` 블록을 추가하고 파일을 `/srv/workkills`에 복사, DNS A 레코드를 그 서버 IP로.

## 메일 받기 (선택)

Cloudflare Email Routing(무료)으로 `hello@workkills.me` → 개인 메일함 전달을 설정할 수 있다 (도메인 DNS가 Cloudflare에 있어야 함).
