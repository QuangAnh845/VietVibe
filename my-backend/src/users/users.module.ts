import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from '../login/schemas/user.schema.js';
import { LoginModule } from '../login/login.module.js';
import { RolesGuard } from '../login/guards/roles.guard.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    LoginModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, RolesGuard],
})
export class UsersModule {}

