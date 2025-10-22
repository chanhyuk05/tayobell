# U-Bell API

Express.js, PostgreSQL, Prisma를 사용한 RESTful API 서버입니다.

## 🚀 기능

- **사용자 관리**: CRUD 작업 (생성, 조회, 수정, 삭제)
- **게시물 관리**: CRUD 작업 및 작성자 연결
- **데이터베이스**: PostgreSQL과 Prisma ORM
- **보안**: Helmet, CORS, Morgan 로깅

## 📋 요구사항

- Node.js 16+
- PostgreSQL 데이터베이스
- npm 또는 yarn

## 🛠️ 설치

1. 의존성 설치:
```bash
npm install
```

2. 환경 변수 설정:
`.env` 파일을 생성하고 다음 내용을 추가하세요:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/ubell_db?schema=public"
PORT=3000
NODE_ENV=development
BUS_API_KEY="your_bus_api_key_here"

# 프로덕션 환경 설정
FRONTEND_URL="https://yourdomain.com"
```

3. 데이터베이스 설정:
```bash
# Prisma 클라이언트 생성
npm run db:generate

# 데이터베이스 스키마 적용
npm run db:push

# 또는 마이그레이션 사용
npm run db:migrate
```

## 🚀 실행

### 개발 모드
```bash
npm run dev
```

### 프로덕션 모드
```bash
npm start
```

## 📚 API 엔드포인트

### BIS (버스 정보 시스템)
- `GET /api/bis/bus-stops/:cityCode/:stationId/arrivals` - 버스 도착 정보 조회
- `WS /api/bis/ws` - BIS WebSocket 연결 (실시간 버스 정보)

### SIS (스마트 정보 시스템)
- `WS /api/sis/ws` - SIS WebSocket 연결

### 사용자 (Users)
- `GET /api/users` - 모든 사용자 조회
- `GET /api/users/:id` - 특정 사용자 조회
- `POST /api/users` - 새 사용자 생성
- `PUT /api/users/:id` - 사용자 정보 수정
- `DELETE /api/users/:id` - 사용자 삭제

### 게시물 (Posts)
- `GET /api/posts` - 모든 게시물 조회
- `GET /api/posts/:id` - 특정 게시물 조회
- `POST /api/posts` - 새 게시물 생성
- `PUT /api/posts/:id` - 게시물 수정
- `DELETE /api/posts/:id` - 게시물 삭제

## 🗄️ 데이터베이스 모델

### User
- `id`: 고유 식별자
- `email`: 이메일 (고유)
- `name`: 이름
- `password`: 비밀번호
- `createdAt`: 생성 시간
- `updatedAt`: 수정 시간

### Post
- `id`: 고유 식별자
- `title`: 제목
- `content`: 내용
- `published`: 발행 상태
- `authorId`: 작성자 ID (User와 연결)
- `createdAt`: 생성 시간
- `updatedAt`: 수정 시간

## 🛠️ 개발 도구

- **Prisma Studio**: 데이터베이스 시각화 도구
```bash
npm run db:studio
```

## 📝 예시 요청

### 사용자 생성
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "홍길동",
    "password": "password123"
  }'
```

### 게시물 생성
```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "첫 번째 게시물",
    "content": "안녕하세요!",
    "authorId": 1,
    "published": true
  }'
```

## 🔧 문제 해결

### 데이터베이스 연결 오류
- PostgreSQL 서비스가 실행 중인지 확인
- `.env` 파일의 DATABASE_URL이 올바른지 확인
- 데이터베이스가 존재하는지 확인

### Prisma 오류
```bash
# Prisma 클라이언트 재생성
npm run db:generate

# 데이터베이스 리셋
npm run db:push
```

### WebSocket 연결 오류
- 서버가 실행 중인지 확인
- CORS 설정이 올바른지 확인
- 프로덕션 환경에서는 FRONTEND_URL 환경 변수 설정

### 환경별 설정
- **개발 환경**: `NODE_ENV=development` (기본값)
- **프로덕션 환경**: `NODE_ENV=production`, `FRONTEND_URL=https://yourdomain.com`

## �� 라이선스

MIT License
