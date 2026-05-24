import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EnvironmentSound, EnvironmentSoundDocument } from './schemas/environment-sound.schema';

@ApiTags('Environment Sounds')
@Controller('environment-sounds')
export class EnvironmentSoundController {
  constructor(
    @InjectModel(EnvironmentSound.name) private envSoundModel: Model<EnvironmentSoundDocument>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách âm thanh môi trường' })
  async findAll() {
    const sounds = await this.envSoundModel.find().exec();
    return {
      data: sounds.map(sound => ({
        id: sound._id,
        name: sound.name,
        audio_url: sound.audio_url
      }))
    };
  }
}
