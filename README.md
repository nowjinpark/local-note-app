# Local Note App

**Language:** [English](#english) | [한국어](#korean)

---

<a id="english"></a>

## English

A local-first desktop note app built with Electron, React, TypeScript, and SQLite. It started as a vibe-coded prototype and was later refined into a portfolio-ready project with clearer structure, safer local data handling, and cleaner repository hygiene.

> Current support: this repository is currently prepared and documented for Windows use.

### Highlights

- Markdown note writing with live preview
- Category tree and tag-based organization
- Title/content search, sorting, and pinned notes
- Soft-delete trash flow with restore
- Markdown export for individual notes
- File attachments with image preview support
- JSON/SQLite backup and restore UI
- Light/dark theme and keyboard shortcuts

### Why I Built It

I wanted a note app that feels closer to a personal knowledge base than a simple memo pad. My priorities were local storage, structured organization, and practical backup support rather than cloud-first syncing.

### Tech Stack

- Electron
- React 18
- TypeScript
- SQLite (`better-sqlite3`)
- Vite
- Electron Forge
- `@uiw/react-md-editor`

### Project Structure

```text
src/
  main.ts                  Electron main process
  preload.ts               Safe IPC bridge
  renderer.tsx             React entry point
  App.tsx                  Root app composition
  components/              Sidebar, note list, editor, settings UI
  database/                SQLite connection, migrations, backup, attachments
  hooks/                   App-wide state management
  shared/                  Shared types, IPC channels, theme definitions
```

### Local Data Policy

- Real note data and attachments are stored outside the repository in Electron's `userData` directory.
- Backup files are also created in the local app data folder.
- Personal notes, backup files, logs, and helper execution files are excluded from Git.

Windows example:

```text
%APPDATA%\note-app\
```

### Run Locally

```bash
npm install
npm start
```

### Verification

```bash
npm run lint
npm run package
```

### Portfolio Notes

- Local-first architecture with source/data separation
- Renderer-to-main IPC design instead of direct file system access
- SQLite CRUD flow with schema migrations
- End-to-end implementation of features people expect in a real note app

### Possible Next Steps

- Better search indexing
- Customizable keyboard shortcuts
- More advanced backup scheduling
- Automated tests and release pipeline

---

<a id="korean"></a>

## 한국어

Electron, React, TypeScript, SQLite로 만든 로컬 퍼스트 데스크톱 노트 앱입니다. 처음에는 바이브코딩으로 빠르게 프로토타입을 만든 뒤, 구조를 다듬고 로컬 데이터 처리와 저장소 구성을 정리해 포트폴리오용 프로젝트로 발전시켰습니다.

> 현재 지원 범위: 이 저장소는 현재 Windows 사용 기준으로 정리되어 있습니다.

### 핵심 기능

- 마크다운 기반 노트 작성과 실시간 미리보기
- 카테고리 트리와 태그를 활용한 정보 분류
- 제목/본문 검색, 정렬, 고정 노트
- 소프트 삭제 기반 휴지통과 복원
- 개별 노트 Markdown 내보내기
- 첨부파일 업로드와 이미지 미리보기
- JSON/SQLite 백업 및 복원 UI
- 라이트/다크 테마와 단축키 지원

### 왜 만들었는가

단순 메모장이 아니라 개인 지식 저장소처럼 쓸 수 있는 앱을 만들고 싶었습니다. 특히 클라우드 동기화보다 로컬 저장, 빠른 입력보다 구조화된 정리, 그리고 실제로 쓸 수 있는 백업 기능을 더 중요하게 생각했습니다.

### 기술 스택

- Electron
- React 18
- TypeScript
- SQLite (`better-sqlite3`)
- Vite
- Electron Forge
- `@uiw/react-md-editor`

### 프로젝트 구조

```text
src/
  main.ts                  Electron 메인 프로세스
  preload.ts               안전한 IPC 브리지
  renderer.tsx             React 진입점
  App.tsx                  앱 루트 구성
  components/              사이드바, 노트 목록, 에디터, 설정 UI
  database/                SQLite 연결, 마이그레이션, 백업, 첨부파일 처리
  hooks/                   전역 앱 상태 관리
  shared/                  공통 타입, IPC 채널, 테마 정의
```

### 로컬 데이터 정책

- 실제 노트 데이터베이스와 첨부파일은 저장소 밖의 Electron `userData` 폴더에 저장됩니다.
- 백업 파일도 동일한 로컬 앱 데이터 폴더에 생성됩니다.
- Git 저장소에는 개인 노트 내용, 백업 파일, 로그, 실행 보조 파일을 포함하지 않습니다.

Windows 예시 경로:

```text
%APPDATA%\note-app\
```

### 실행 방법

```bash
npm install
npm start
```

### 검증

```bash
npm run lint
npm run package
```

### 포트폴리오 포인트

- 로컬 퍼스트 아키텍처와 소스 코드/사용자 데이터 분리
- 렌더러가 직접 파일 시스템에 접근하지 않도록 분리한 IPC 구조
- SQLite 기반 CRUD와 스키마 마이그레이션 구성
- 실제 노트 앱에 필요한 기능을 끝까지 연결한 구현 경험

### 이후 확장 아이디어

- 검색 인덱싱 고도화
- 단축키 커스터마이징
- 자동 백업 스케줄링 개선
- 테스트 코드와 배포 파이프라인 추가
