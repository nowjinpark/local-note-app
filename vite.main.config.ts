import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        // TypeORM의 선택적 의존성들을 external로 설정
        '@google-cloud/spanner',
        'better-sqlite3',
        'ioredis',
        'mongodb',
        'mssql',
        'mysql',
        'mysql2',
        'oracledb',
        'pg',
        'pg-query-stream',
        'redis',
        'sql.js',
        'sqlite3',
        'typeorm-aurora-data-api-driver',
      ],
    },
  },
});
