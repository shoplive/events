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
├── CNAME                     커스텀 도메인 (GitHub Pages)
├── .nojekyll                 Jekyll 전처리 없이 파일 그대로 서빙
├── index.html                행사 목록
├── 404.html
├── favicon.svg               ⚠ 임시 플레이스홀더 — 실제 브랜드 파비콘으로 교체 필요
├── robots.txt / sitemap.xml
├── summit-2026/
│   ├── index.html
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

Pages 활성화는 워크플로가 `configure-pages` 의 `enablement: true` 로 직접 처리하므로,
Settings → Pages 에서 손으로 Source 를 지정할 필요는 없습니다.
남은 것은 DNS 와 HTTPS 두 가지입니다.

1. **DNS** — `shoplivecorp.com` 존에 CNAME 레코드를 추가합니다.

   ```
   events.shoplivecorp.com.  CNAME  shoplive.github.io.
   ```

   커스텀 도메인 자체는 저장소 루트의 `CNAME` 파일로 지정되며, 배포 아티팩트에 함께
   올라갑니다. 따라서 Settings 에서 도메인을 다시 입력할 필요는 없고, 도메인을 바꿀 때는
   `CNAME` 파일을 고치면 됩니다.

2. **HTTPS** — DNS 가 전파되면 Settings → Pages 에서 커스텀 도메인이 확인됩니다.
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

- `favicon.svg` 는 브랜드 레드만 쓴 임시 도형입니다. 실제 파비콘으로 교체해 주세요.
- `summit-2026/assets/css/fonts.css` 에 PP Mori ExtraBold `@font-face` 가 주석으로
  남아 있습니다. 웹 라이선스 woff2 를 확보하면 주석을 풀어 적용할 수 있고,
  그 전까지 히어로 워드마크는 Pretendard 로 렌더링됩니다.
- 연사 카드 일부는 "연사 협의 중" 플레이스홀더 상태입니다.
