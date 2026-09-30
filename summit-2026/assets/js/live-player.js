/* ============================================================
   히어로 라이브 — .hero-lines 맨 아래 줄에 서밋 방송을
   Shoplive 오버롤 상단 영역(top campaign)으로 띄운다.
   featuredOnly 로 하단 목록은 빼고, fixedCampaignKey 로 방송을 고정한다.

   아티팩트에서 나온 파일이 아니다. main.js 는 재임포트 때마다 새로 쓰이므로
   따로 두고, tools/import_artifact.py 가 페이지 끝에 이 파일과
   shoplive.js 로더를 함께 붙인다.
   ============================================================ */
(function () {
  var ACCESS_KEY = 'VfPjXW4hE99SZFBQ0gRq';
  var CAMPAIGN_KEY = 'a87e59878d5a';
  var CONTAINER_ID = 'hero-live-player';

  var lines = document.querySelector('.hero-lines');
  var shoplive = window.cloud && window.cloud.shoplive;
  if (!lines || !shoplive) return;

  var row = document.createElement('div');
  row.id = CONTAINER_ID;
  row.className = 'hero-live';
  lines.appendChild(row);

  shoplive.initPlugin({ accessKey: ACCESS_KEY });
  shoplive.setOverall(CONTAINER_ID, {
    featuredOnly: true,
    featured: { fixedCampaignKey: CAMPAIGN_KEY },
  });
})();
