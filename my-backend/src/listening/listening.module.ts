import { Module } from '@nestjs/common';
import { ListeningController } from './listening.controller';
import { ListeningService } from './listening.service';
import { LoginModule } from '../login/login.module.js';

import { MongooseModule } from '@nestjs/mongoose';
import { SituationController } from './situation.controller';
import { SituationService } from './situation.service';
import { EnvironmentSoundController } from './environment-sound.controller';
import { Situation, SituationSchema } from './schemas/situation.schema';
import { EnvironmentSound, EnvironmentSoundSchema } from './schemas/environment-sound.schema';
import { UserListeningProgress, UserListeningProgressSchema } from './schemas/user-listening-progress.schema';

@Module({
  imports: [
    LoginModule,
    MongooseModule.forFeature([
      { name: Situation.name, schema: SituationSchema },
      { name: EnvironmentSound.name, schema: EnvironmentSoundSchema },
      { name: UserListeningProgress.name, schema: UserListeningProgressSchema },
    ]),
  ],
  controllers: [ListeningController, SituationController, EnvironmentSoundController],
  providers: [ListeningService, SituationService],
})
export class ListeningModule {}

