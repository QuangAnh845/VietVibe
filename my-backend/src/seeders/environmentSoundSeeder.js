const path = require('path');
const mongoose = require('mongoose');

// Tải biến môi trường
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
} catch (error) {
  console.warn(
    'Cảnh báo: Không thể tải dotenv. Vui lòng đảm bảo bạn đã đặt biến môi trường MONGO_URI.',
  );
}

const { EnvironmentSound } = require('../models');

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/vietvibe_db';

const ambientSounds = [
  {
    name: 'カフェ',
    audio_url: '/audios/cafe.mp4',
  },
  {
    name: '道路',
    audio_url: '/audios/road.mp4',
  },
  {
    name: '市場',
    audio_url: '/audios/market.mp4',
  },
  {
    name: 'オフィス',
    audio_url: '/audios/office.mp4',
  },
];

async function seedEnvironmentSounds() {
  try {
    console.log('1. Đang kết nối MongoDB Atlas...');
    await mongoose.connect(MONGO_URI);
    console.log('=> Kết nối thành công MongoDB!');

    // Xóa dữ liệu cũ
    console.log('\n2. Đang xóa dữ liệu cũ của collection environmentsounds...');
    await EnvironmentSound.deleteMany({});
    console.log('=> Xóa dữ liệu cũ thành công!');

    // Tạo mới
    console.log('\n3. Đang thêm các âm thanh môi trường mới...');
    const result = await EnvironmentSound.insertMany(ambientSounds);
    console.log(`=> Thêm thành công ${result.length} âm thanh môi trường!`);
    console.log(result);

    console.log('\n🎉 ĐÃ THÊM CÁC ÂM THANH MÔI TRƯỜNG VÀO DATABASE THÀNH CÔNG! 🎉');
  } catch (error) {
    console.error('\n❌ Lỗi trong quá trình seed data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('=> Đã ngắt kết nối MongoDB.');
    process.exit(0);
  }
}

seedEnvironmentSounds();
