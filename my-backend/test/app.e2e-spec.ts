import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/listening/admin/create (POST) requires auth', () => {
    return request(app.getHttpServer())
      .post('/listening/admin/create')
      .send({
        learningUnitId: '000000000000000000000000',
        titleVi: 'Test',
        titleJa: 'テスト',
        audioUrl: '/audios/test.mp4',
        durationSeconds: 10,
      })
      .expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});
