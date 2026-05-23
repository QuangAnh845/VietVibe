import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../login/schemas/user.schema.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpdatePasswordDto } from './dto/update-password.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).select('-password_hash').exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, updateData: UpdateProfileDto) {
    if (updateData.email) {
      const existingUser = await this.userModel.findOne({ email: updateData.email, _id: { $ne: userId } }).exec();
      if (existingUser) {
        throw new BadRequestException('Email is already in use');
      }
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    ).select('-password_hash').exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  async updatePassword(userId: string, updatePasswordDto: UpdatePasswordDto) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordMatches = await bcrypt.compare(updatePasswordDto.currentPassword, user.password_hash);
    if (!passwordMatches) {
      throw new BadRequestException('Incorrect current password');
    }

    const newPasswordHash = await bcrypt.hash(updatePasswordDto.newPassword, 10);
    user.password_hash = newPasswordHash;
    await user.save();

    return { message: 'Password updated successfully' };
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { avatar_url: avatarUrl } },
      { returnDocument: 'after' }
    ).select('-password_hash').exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }
}
