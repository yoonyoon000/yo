# 쓰담 포토부스

사진 위에 웹툰 그림체 손 스티커를 얹어 포토카드처럼 꾸미는 React + Vite 웹앱입니다. 모든 편집과 저장은 브라우저 안에서만 동작합니다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 Vite가 안내하는 주소로 접속하면 됩니다.

## 빌드

```bash
npm run build
npm run preview
```

정적 파일은 `dist/` 폴더에 생성되므로 GitHub Pages, Netlify 같은 정적 호스팅에 올릴 수 있습니다.

## 스티커 이미지 추가

투명 배경 PNG를 아래 경로에 넣으면 앱의 스티커 목록에서 자동으로 사용됩니다.

```text
src/assets/stickers/
  cheek-pinch.png
  v-sign.png
  head-pat.png
  hand-heart.png
  chin-pose.png
  waving-hand.png
  cheek-poke.png
  face-frame.png
```

현재 PNG 파일이 없어도 앱은 플레이스홀더로 정상 동작합니다. 실제 파일을 넣은 뒤 개발 서버를 다시 시작하거나 빌드하면 이미지가 반영됩니다.

현재 포함된 파일 매칭은 다음과 같습니다.

```text
꼬집기.png -> cheek-pinch.png
브이.png -> v-sign.png
쓰담.png -> head-pat.png
볼하트.png -> hand-heart.png
받침.png -> chin-pose.png
하이.png -> waving-hand.png
볼콕.png -> cheek-poke.png
꽃받침.png -> face-frame.png
```

## 주요 기능

- JPG/PNG 업로드
- 스티커 추가, 드래그 이동, 크기 조절, 회전, 삭제
- Delete/Backspace 키 삭제
- 좌우반전, 레이어 앞으로/뒤로 보내기
- 하트, 반짝이, 말풍선 장식 추가
- 사진 밝기와 블러 조절
- 날짜/로고 워터마크 선택
- PNG 다운로드 버튼: `이미지 저장하기`
