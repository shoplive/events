# Shoplive Events

`events.shoplivecorp.com` 에 올라가는 행사 페이지들을 담고 있는 정적 사이트입니다.
저장소 루트가 곧 사이트 루트이고, 행사 하나가 디렉터리 하나에 대응합니다.

| 경로 | 내용 |
| --- | --- |
| `/` | 행사 목록 (`index.html`) |
| `/summit-2026/` | Video Commerce Summit 2026 |

배포 주소: <https://events.shoplivecorp.com/summit-2026>

## 구조

```
.
├── CNAME                     의도한 도메인 기록용 (Actions 배포에서는 무시됨 — 아래 배포 참고)
├── .nojekyll                 Jekyll 전처리 없이 파일 그대로 서빙
├── index.html                행사 목록
├── 404.html
├── favicon.svg               Shoplive 브랜드 파비콘 (developer.shoplive.cloud 와 동일)
├── robots.txt / sitemap.xml
├── summit-2026/
│   ├── index.html
│   ├── og-image.png          링크 미리보기 이미지 — 저장소 소유, 임포터가 건드리지 않음
│   └── assets/
│       ├── css/fonts.css     Pretendard @font-face
│       ├── css/style.css     페이지 스타일
│       ├── js/main.js        히어로 파티클·탭·FAQ 등 페이지 동작
│       ├── fonts/*.woff2
│       └── img/*
├── tools/
│   ├── import_artifact.py    아티팩트 HTML → 정적 페이지 변환
│   └── check_links.py        로컬 링크 검사
└── .github/workflows/deploy-pages.yml
```

빌드 단계는 없습니다. 저장소에 있는 파일이 그대로 서빙됩니다.

## 로컬에서 확인하기

```bash
python3 -m http.server 8000
# http://localhost:8000/summit-2026/
```

파일을 `file://` 로 직접 열면 폰트와 이미지 경로가 깨지므로, 위처럼 HTTP 서버를 통해 확인하세요.

링크가 모두 살아있는지 확인:

```bash
python3 tools/check_links.py
```

### 링크 미리보기 이미지

`og:image` 와 `twitter:image` 는 `summit-2026/og-image.png` 를 가리킵니다. 이 파일은
**일부러 `assets/` 바깥에** 둡니다. 아티팩트가 어떤 자산을 담을지는 아티팩트가 정하는데,
`og:image` 가 그중 하나를 가리키고 있으면 아티팩트가 그 이미지를 바꾸거나 뺄 때마다
미리보기가 깨집니다. 실제로 두 번 깨졌습니다. `assets/` 바깥에 두면 재임포트가 닿지
않습니다.

교체할 때 지킬 것:

- **1200×630** (비율 1.91:1). `twitter:card` 가 `summary_large_image` 라 1.91:1 로
  잘립니다. 이전 이미지는 599×200(3:1)이라 가로 36% 가 잘려 워드마크 양끝이 날아갔습니다.
- **PNG 또는 JPEG.** SVG·WebP 는 링크 미리보기에서 렌더하지 않는 서비스가 많습니다.

`tools/check_links.py` 가 이 파일의 존재를 검사하므로, 지우거나 이름을 바꾸면 배포가
막힙니다.

## 페이지 수정하기

`summit-2026/index.html` 과 `assets/` 아래 파일을 직접 고치면 됩니다.

원본 Claude Artifact 를 다시 내보내서 통째로 갱신해야 할 때는:

```bash
python3 tools/import_artifact.py <내려받은-artifact.html> --out summit-2026
```

아티팩트는 폰트·이미지를 전부 base64 로 품고 있는 1.1MB 짜리 단일 HTML 입니다.
이 스크립트가 자산을 파일로 풀어내고 CSS·JS 를 분리해 39KB 문서로 만듭니다.
자산은 내용 해시로 식별하므로, 그림이 바뀌지 않는 한 다시 내보내도 파일명이 유지됩니다.
새 자산이 들어오면 `asset-01.png` 같은 임시 이름으로 떨어지면서 경고를 출력하니,
`tools/import_artifact.py` 의 `ASSET_NAMES` 에 제대로 된 이름을 추가해 주세요.

## 배포

`main` 에 푸시되면 `.github/workflows/deploy-pages.yml` 이 링크 검사를 돌리고
GitHub Pages 로 올립니다.

Pages 활성화(Source 를 GitHub Actions 로 지정하는 것)는 워크플로가 `configure-pages` 의
`enablement: true` 로 직접 처리합니다. 나머지 세 가지는 수동 설정이 필요합니다.

1. **DNS** — `shoplivecorp.com` 존에 CNAME 레코드를 추가합니다.

   ```
   events.shoplivecorp.com.  CNAME  shoplive.github.io.
   ```

2. **커스텀 도메인 등록** — Settings → Pages → Custom domain 에
   `events.shoplivecorp.com` 을 입력하고 Save 합니다.

   **DNS 만으로는 연결되지 않습니다.** GitHub 이 이 도메인을 이 저장소의 것으로 알아야
   하는데, Actions 로 배포할 때는 저장소의 `CNAME` 파일이 그 역할을 하지 못합니다.
   문서에 그대로 적혀 있습니다 — *"publishing from a custom GitHub Actions workflow 인
   경우 `CNAME` 파일은 생성되지 않고, 기존 `CNAME` 파일은 무시되며 필요하지도 않다."*
   `CNAME` 파일을 브랜치 배포에서처럼 읽어가는 것은 브랜치를 소스로 쓸 때뿐입니다.

   저장소의 `CNAME` 파일은 의도한 도메인을 기록해 두는 용도로만 남겨 둔 것이며,
   **이 파일을 고쳐도 도메인은 바뀌지 않습니다.** 도메인 변경은 Settings 에서 하세요.

   등록이 끝나면 `shoplive.github.io/events/*` 로 들어온 요청은 커스텀 도메인으로
   리다이렉트됩니다.

3. **HTTPS** — DNS 가 전파되면 Settings → Pages 에서 커스텀 도메인이 확인됩니다.
   확인이 끝나면 **Enforce HTTPS** 를 켜 주세요. 이 사이트는 https 로만 서비스하며,
   이 설정이 켜져 있어야 `http://` 로 들어온 요청이 `https://` 로 넘어갑니다.
   인증서 발급에는 도메인 확인 후 몇 분에서 길게는 한 시간 정도 걸릴 수 있습니다.

> GitHub Pages 는 무료·Team 플랜에서 public 저장소만 게시할 수 있습니다.
> 저장소를 private 으로 되돌려야 한다면 Enterprise Cloud 가 아닌 이상 Pages 를 쓸 수 없으니,
> 아래 "GitHub Pages 가 아닌 곳에 올릴 경우" 를 따라 주세요.

### HTTPS 전용

이 사이트는 `https://events.shoplivecorp.com` 으로만 서비스합니다.
`canonical`·OG·`sitemap.xml`·`robots.txt` 의 URL 이 모두 `https://` 로 맞춰져 있으니,
새 페이지를 추가할 때도 절대 URL 은 `https://` 로 적어 주세요.

### GitHub Pages 가 아닌 곳에 올릴 경우

저장소 내용은 특정 호스팅에 묶여 있지 않은 순수 정적 파일입니다.
S3·CloudFront 나 사내 웹서버에 올린다면 저장소 루트를 문서 루트로 그대로 복사하고,
`CNAME`·`.nojekyll`·`.github/` 만 빼면 됩니다.
이 경우 인증서 발급과 `http://` → `https://` 리다이렉트는 그쪽에서 직접 설정해야 합니다.

## 외부 의존성

페이지가 네트워크에서 받아오는 것은 두 가지뿐이고, 나머지 자산은 모두 저장소 안에 있습니다.

- **Google Fonts** — Noto Sans JP (일본어 표기용)
- **Kakao 지도** (`ssl.daumcdn.net`) — 오시는 길 약도

## 알려진 사항

- `summit-2026/assets/css/fonts.css` 에 PP Mori ExtraBold `@font-face` 가 주석으로
  남아 있습니다. 웹 라이선스 woff2 를 확보하면 주석을 풀어 적용할 수 있고,
  그 전까지 히어로 워드마크는 Pretendard 로 렌더링됩니다.
- 연사 카드 일부는 "연사 협의 중" 플레이스홀더 상태입니다.
