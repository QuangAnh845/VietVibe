const path = require('path');
const mongoose = require('mongoose');

try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
} catch (error) {
  console.warn('Cannot load .env. Falling back to local MongoDB URI.');
}

const {
  Place,
  Level,
  Situation,
  LearningUnit,
  VocabularyCard,
  ListeningLesson,
  TranscriptLine,
} = require('../models');

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/vietvibe_db';

const fallbackAudioUrl = '/audios/cafe.mp4';

const existingUnitVocabularyTopUps = [
  {
    titleVi: 'Bài 1: Ăn phở',
    vocabulary: [
      ['Nước dùng', 'スープ', 'Nước dùng rất ngon.', 'スープがとてもおいしいです。', 'food'],
      ['Tái', 'レア', 'Tôi muốn thịt bò tái.', '牛肉はレアがいいです。', 'food'],
      ['Chín', '火が通った', 'Tôi ăn bò chín.', '火が通った牛肉を食べます。', 'food'],
      ['Rau thơm', '香草', 'Có rau thơm không?', '香草はありますか？', 'food'],
      ['Không hành', 'ネギなし', 'Cho tôi không hành.', 'ネギなしでお願いします。', 'request'],
      ['Một bát', '一杯', 'Cho em một bát phở.', 'フォーを一杯ください。', 'quantity'],
      ['Nước béo', '脂入りスープ', 'Cho em ít nước béo.', '脂入りスープを少しください。', 'food'],
    ],
  },
  {
    titleVi: 'Bài 2: Thanh toán tại nhà hàng',
    vocabulary: [
      ['Thanh toán', '支払い', 'Tôi cần thanh toán.', '支払いをお願いします。', 'payment'],
      ['Tiền mặt', '現金', 'Tôi trả bằng tiền mặt.', '現金で払います。', 'payment'],
      ['Thẻ tín dụng', 'クレジットカード', 'Bạn nhận thẻ tín dụng không?', 'クレジットカードは使えますか？', 'payment'],
      ['Hóa đơn', '領収書', 'Cho tôi xin hóa đơn.', '領収書をください。', 'payment'],
      ['Tổng cộng', '合計', 'Tổng cộng bao nhiêu tiền?', '合計いくらですか？', 'payment'],
      ['Thẻ thành viên', '会員カード', 'Tôi có thẻ thành viên.', '会員カードを持っています。', 'membership'],
      ['Túi', '袋', 'Bạn có túi không?', '袋はありますか？', 'shopping'],
      ['Tiền thừa', 'お釣り', 'Tôi nhận tiền thừa.', 'お釣りを受け取ります。', 'payment'],
      ['Giảm giá', '割引', 'Có giảm giá không?', '割引はありますか？', 'payment'],
      ['Máy quẹt thẻ', 'カード端末', 'Máy quẹt thẻ ở đâu?', 'カード端末はどこですか？', 'payment'],
    ],
  },
  {
    titleVi: 'Bài 3: Mua rau ở chợ',
    vocabulary: [
      ['Rau muống', '空芯菜', 'Rau muống này bao nhiêu?', 'この空芯菜はいくらですか？', 'market'],
      ['Một bó', '一束', 'Cho em hai bó.', '二束ください。', 'quantity'],
      ['Tươi', '新鮮', 'Rau có tươi không?', '野菜は新鮮ですか？', 'quality'],
      ['Mới nhập', '入荷したばかり', 'Rau mới nhập sáng nay.', '今朝入ったばかりです。', 'quality'],
      ['Mười lăm nghìn', '一万五千ドン', 'Một bó mười lăm nghìn.', '一束一万五千ドンです。', 'price'],
      ['Nói lại', 'もう一度言う', 'Chị nói lại giúp em được không?', 'もう一度言ってもらえますか？', 'communication'],
      ['Nói chậm hơn', 'もっとゆっくり話す', 'Tôi sẽ nói chậm hơn.', 'もっとゆっくり話します。', 'communication'],
      ['Cần túi', '袋が必要', 'Em có cần túi không?', '袋は必要ですか？', 'shopping'],
      ['Bao nhiêu', 'いくら', 'Cái này bao nhiêu?', 'これはいくらですか？', 'price'],
      ['Hai bó', '二束', 'Cho tôi hai bó.', '二束ください。', 'quantity'],
    ],
  },
];

const supplementalUnits = [
  {
    placeVi: 'Siêu thị',
    situationVi: 'Tìm hàng trong siêu thị',
    situationJa: 'スーパーで商品を探す',
    titleVi: 'Bài 4: Tìm đồ trong siêu thị',
    titleJa: '第4課：スーパーで商品を探す',
    levelCode: 'A1',
    listeningTitleVi: 'Hỏi vị trí sản phẩm',
    listeningTitleJa: '商品の場所を聞く',
    transcriptLines: [
      ['Xin lỗi, nước mắm ở đâu ạ?', 'すみません、魚醤はどこですか？'],
      ['Ở dãy số ba, bên tay trái.', '3番通路の左側です。'],
      ['Có loại chai nhỏ không?', '小さいボトルはありますか？'],
      ['Có, ở kệ phía dưới.', 'あります。下の棚です。'],
    ],
    vocabulary: [
      ['Nước mắm', '魚醤', 'Nước mắm ở đâu ạ?', '魚醤はどこですか？', 'supermarket'],
      ['Dãy số ba', '3番通路', 'Ở dãy số ba.', '3番通路です。', 'location'],
      ['Bên tay trái', '左側', 'Nó ở bên tay trái.', '左側にあります。', 'location'],
      ['Chai nhỏ', '小さいボトル', 'Có chai nhỏ không?', '小さいボトルはありますか？', 'size'],
      ['Kệ phía dưới', '下の棚', 'Ở kệ phía dưới.', '下の棚にあります。', 'location'],
      ['Quầy rau', '野菜売り場', 'Quầy rau ở đâu?', '野菜売り場はどこですか？', 'location'],
      ['Quầy thịt', '肉売り場', 'Tôi tìm quầy thịt.', '肉売り場を探しています。', 'location'],
      ['Hết hàng', '売り切れ', 'Sản phẩm này hết hàng.', 'この商品は売り切れです。', 'stock'],
      ['Còn hàng', '在庫がある', 'Còn hàng không?', '在庫はありますか？', 'stock'],
      ['Nhân viên', '店員', 'Tôi hỏi nhân viên.', '店員に聞きます。', 'people'],
    ],
  },
  {
    placeVi: 'Bệnh viện',
    situationVi: 'Mô tả triệu chứng',
    situationJa: '症状を説明する',
    titleVi: 'Bài 5: Nói triệu chứng ở bệnh viện',
    titleJa: '第5課：病院で症状を伝える',
    levelCode: 'A2',
    listeningTitleVi: 'Đăng ký khám và nói triệu chứng',
    listeningTitleJa: '受付で症状を伝える',
    transcriptLines: [
      ['Tôi bị đau đầu từ hôm qua.', '昨日から頭が痛いです。'],
      ['Anh có bị sốt không?', '熱はありますか？'],
      ['Có, tôi hơi sốt và ho.', 'はい、少し熱があって咳も出ます。'],
      ['Vui lòng điền phiếu này.', 'この用紙に記入してください。'],
    ],
    vocabulary: [
      ['Đau đầu', '頭痛', 'Tôi bị đau đầu.', '頭が痛いです。', 'symptom'],
      ['Sốt', '熱', 'Tôi hơi sốt.', '少し熱があります。', 'symptom'],
      ['Ho', '咳', 'Tôi bị ho.', '咳が出ます。', 'symptom'],
      ['Từ hôm qua', '昨日から', 'Từ hôm qua tôi thấy mệt.', '昨日からだるいです。', 'time'],
      ['Điền phiếu', '用紙に記入する', 'Vui lòng điền phiếu này.', 'この用紙に記入してください。', 'hospital'],
      ['Đau bụng', '腹痛', 'Tôi bị đau bụng.', 'お腹が痛いです。', 'symptom'],
      ['Chóng mặt', 'めまい', 'Tôi thấy chóng mặt.', 'めまいがします。', 'symptom'],
      ['Dị ứng', 'アレルギー', 'Tôi bị dị ứng thuốc.', '薬のアレルギーがあります。', 'medical'],
      ['Bảo hiểm', '保険', 'Tôi có bảo hiểm.', '保険があります。', 'hospital'],
      ['Đơn thuốc', '処方箋', 'Tôi nhận đơn thuốc.', '処方箋を受け取ります。', 'medical'],
    ],
  },
  {
    placeVi: 'Bến xe',
    situationVi: 'Mua vé xe',
    situationJa: 'バスの切符を買う',
    titleVi: 'Bài 6: Mua vé ở bến xe',
    titleJa: '第6課：バス停で切符を買う',
    levelCode: 'A1',
    listeningTitleVi: 'Hỏi vé và giờ khởi hành',
    listeningTitleJa: '切符と出発時間を聞く',
    transcriptLines: [
      ['Cho tôi một vé đi Đà Nẵng.', 'ダナン行きの切符を一枚ください。'],
      ['Xe khởi hành lúc mấy giờ?', 'バスは何時に出発しますか？'],
      ['Mười giờ sáng, ở cổng số hai.', '午前10時、2番ゲートです。'],
      ['Tôi có thể đổi vé không?', '切符を変更できますか？'],
    ],
    vocabulary: [
      ['Vé xe', 'バスの切符', 'Cho tôi một vé xe.', 'バスの切符を一枚ください。', 'transport'],
      ['Đi Đà Nẵng', 'ダナン行き', 'Tôi mua vé đi Đà Nẵng.', 'ダナン行きの切符を買います。', 'destination'],
      ['Khởi hành', '出発する', 'Xe khởi hành lúc mấy giờ?', '何時に出発しますか？', 'time'],
      ['Cổng số hai', '2番ゲート', 'Xe ở cổng số hai.', 'バスは2番ゲートです。', 'location'],
      ['Đổi vé', '切符を変更する', 'Tôi muốn đổi vé.', '切符を変更したいです。', 'transport'],
      ['Ghế ngồi', '座席', 'Ghế của tôi ở đâu?', '私の座席はどこですか？', 'transport'],
      ['Hành lý', '荷物', 'Tôi có hai kiện hành lý.', '荷物が二つあります。', 'transport'],
      ['Trễ xe', 'バスに遅れる', 'Tôi bị trễ xe.', 'バスに遅れました。', 'transport'],
      ['Một chiều', '片道', 'Tôi mua vé một chiều.', '片道切符を買います。', 'ticket'],
      ['Khứ hồi', '往復', 'Có vé khứ hồi không?', '往復切符はありますか？', 'ticket'],
    ],
  },
  {
    placeVi: 'Tiệm làm đẹp',
    situationVi: 'Đặt lịch làm tóc',
    situationJa: '美容室を予約する',
    titleVi: 'Bài 7: Đặt lịch ở tiệm làm đẹp',
    titleJa: '第7課：美容室を予約する',
    levelCode: 'A2',
    listeningTitleVi: 'Đặt lịch cắt tóc',
    listeningTitleJa: 'ヘアカットを予約する',
    transcriptLines: [
      ['Tôi muốn đặt lịch cắt tóc chiều nay.', '今日の午後、カットを予約したいです。'],
      ['Anh muốn mấy giờ?', '何時がよろしいですか？'],
      ['Khoảng ba giờ được không?', '3時ごろは大丈夫ですか？'],
      ['Được ạ, anh muốn cắt ngắn hay tỉa nhẹ?', '大丈夫です。短くしますか、少し整えますか？'],
    ],
    vocabulary: [
      ['Đặt lịch', '予約する', 'Tôi muốn đặt lịch.', '予約したいです。', 'salon'],
      ['Cắt tóc', '髪を切る', 'Tôi muốn cắt tóc.', '髪を切りたいです。', 'salon'],
      ['Chiều nay', '今日の午後', 'Tôi rảnh chiều nay.', '今日の午後は空いています。', 'time'],
      ['Ba giờ', '3時', 'Ba giờ được không?', '3時は大丈夫ですか？', 'time'],
      ['Cắt ngắn', '短く切る', 'Tôi muốn cắt ngắn.', '短く切りたいです。', 'style'],
      ['Tỉa nhẹ', '少し整える', 'Chỉ tỉa nhẹ thôi.', '少し整えるだけでいいです。', 'style'],
      ['Gội đầu', 'シャンプー', 'Có gội đầu không?', 'シャンプーはありますか？', 'service'],
      ['Nhuộm tóc', '髪を染める', 'Tôi muốn nhuộm tóc.', '髪を染めたいです。', 'service'],
      ['Kiểu này', 'このスタイル', 'Tôi muốn kiểu này.', 'このスタイルにしたいです。', 'style'],
      ['Bao lâu', 'どのくらい', 'Mất bao lâu?', 'どのくらいかかりますか？', 'time'],
    ],
  },
  {
    placeVi: 'Ngân hàng',
    situationVi: 'Mở tài khoản ngân hàng',
    situationJa: '銀行口座を開く',
    titleVi: 'Bài 8: Mở tài khoản ngân hàng',
    titleJa: '第8課：銀行口座を開く',
    levelCode: 'B1',
    listeningTitleVi: 'Hỏi thủ tục mở tài khoản',
    listeningTitleJa: '口座開設の手続きを聞く',
    transcriptLines: [
      ['Tôi muốn mở tài khoản ngân hàng.', '銀行口座を開きたいです。'],
      ['Anh có hộ chiếu hoặc thẻ cư trú không?', 'パスポートか在留カードはありますか？'],
      ['Tôi có hộ chiếu và địa chỉ hiện tại.', 'パスポートと現住所があります。'],
      ['Vui lòng ký vào mẫu đơn này.', 'この申込書に署名してください。'],
    ],
    vocabulary: [
      ['Mở tài khoản', '口座を開く', 'Tôi muốn mở tài khoản.', '口座を開きたいです。', 'bank'],
      ['Ngân hàng', '銀行', 'Tôi đến ngân hàng.', '銀行に行きます。', 'bank'],
      ['Hộ chiếu', 'パスポート', 'Tôi có hộ chiếu.', 'パスポートがあります。', 'document'],
      ['Thẻ cư trú', '在留カード', 'Anh có thẻ cư trú không?', '在留カードはありますか？', 'document'],
      ['Địa chỉ hiện tại', '現住所', 'Đây là địa chỉ hiện tại của tôi.', 'これが私の現住所です。', 'document'],
      ['Mẫu đơn', '申込書', 'Vui lòng điền mẫu đơn.', '申込書に記入してください。', 'document'],
      ['Ký tên', '署名する', 'Vui lòng ký tên.', '署名してください。', 'document'],
      ['Thẻ ATM', 'ATMカード', 'Khi nào nhận thẻ ATM?', 'ATMカードはいつ受け取れますか？', 'bank'],
      ['Rút tiền', 'お金を引き出す', 'Tôi muốn rút tiền.', 'お金を引き出したいです。', 'bank'],
      ['Chuyển khoản', '振り込み', 'Tôi muốn chuyển khoản.', '振り込みをしたいです。', 'bank'],
    ],
  },
  {
    placeVi: 'Taxi',
    situationVi: 'Đi taxi',
    situationJa: 'タクシーに乗る',
    titleVi: 'Bài 9: Nói điểm đến với tài xế taxi',
    titleJa: '第9課：タクシーで行き先を伝える',
    levelCode: 'A2',
    listeningTitleVi: 'Nói điểm đến khi đi taxi',
    listeningTitleJa: 'タクシーで目的地を伝える',
    transcriptLines: [
      ['Cho tôi đến ga Hà Nội.', 'ハノイ駅までお願いします。'],
      ['Anh muốn đi đường cao tốc không?', '高速道路を使いますか？'],
      ['Không cần, tôi không vội.', 'いいえ、急いでいません。'],
      ['Đến nơi thì báo tôi nhé.', '着いたら教えてください。'],
    ],
    vocabulary: [
      ['Ga Hà Nội', 'ハノイ駅', 'Cho tôi đến ga Hà Nội.', 'ハノイ駅までお願いします。', 'taxi'],
      ['Đường cao tốc', '高速道路', 'Đi đường cao tốc được không?', '高速道路を使えますか？', 'taxi'],
      ['Không vội', '急いでいない', 'Tôi không vội.', '急いでいません。', 'taxi'],
      ['Đến nơi', '到着する', 'Đến nơi thì báo tôi.', '着いたら教えてください。', 'taxi'],
      ['Bao nhiêu tiền', 'いくら', 'Đi đến đây bao nhiêu tiền?', 'ここまでいくらですか？', 'price'],
      ['Rẽ trái', '左に曲がる', 'Làm ơn rẽ trái.', '左に曲がってください。', 'direction'],
      ['Rẽ phải', '右に曲がる', 'Làm ơn rẽ phải.', '右に曲がってください。', 'direction'],
      ['Dừng ở đây', 'ここで止まる', 'Dừng ở đây giúp tôi.', 'ここで止まってください。', 'taxi'],
      ['Đi chậm', 'ゆっくり行く', 'Anh đi chậm một chút.', '少しゆっくり行ってください。', 'request'],
      ['Hóa đơn taxi', 'タクシーの領収書', 'Cho tôi xin hóa đơn taxi.', '領収書をください。', 'payment'],
    ],
  },
  {
    placeVi: 'Siêu thị',
    situationVi: 'Thanh toán ở quầy siêu thị',
    situationJa: 'スーパーのレジで支払う',
    titleVi: 'Bài 10: Thanh toán ở siêu thị',
    titleJa: '第10課：スーパーのレジで支払う',
    levelCode: 'A1',
    listeningTitleVi: 'Hội thoại ở quầy thu ngân',
    listeningTitleJa: 'レジでの会話',
    transcriptLines: [
      ['Bạn có cần túi không?', '袋は必要ですか？'],
      ['Có, cho tôi một túi nhỏ.', 'はい、小さい袋を一枚ください。'],
      ['Bạn có thẻ thành viên không?', '会員カードはありますか？'],
      ['Không, tôi trả bằng thẻ.', 'いいえ、カードで払います。'],
    ],
    vocabulary: [
      ['Quầy thu ngân', 'レジ', 'Quầy thu ngân ở đâu?', 'レジはどこですか？', 'checkout'],
      ['Túi nhỏ', '小さい袋', 'Cho tôi một túi nhỏ.', '小さい袋を一枚ください。', 'shopping'],
      ['Thẻ thành viên', '会員カード', 'Bạn có thẻ thành viên không?', '会員カードはありますか？', 'membership'],
      ['Trả bằng thẻ', 'カードで払う', 'Tôi trả bằng thẻ.', 'カードで払います。', 'payment'],
      ['Mã giảm giá', 'クーポン', 'Tôi có mã giảm giá.', 'クーポンがあります。', 'payment'],
      ['Tính tiền', '会計する', 'Làm ơn tính tiền.', '会計をお願いします。', 'checkout'],
      ['Hàng đông lạnh', '冷凍食品', 'Hàng đông lạnh ở đâu?', '冷凍食品はどこですか？', 'supermarket'],
      ['Biên lai', 'レシート', 'Cho tôi xin biên lai.', 'レシートをください。', 'payment'],
      ['Tổng tiền', '合計金額', 'Tổng tiền bao nhiêu?', '合計金額はいくらですか？', 'payment'],
      ['Không cần túi', '袋はいらない', 'Không cần túi.', '袋はいりません。', 'shopping'],
    ],
  },
];

function buildVocabulary(vocabulary, learningUnitId, titleVi) {
  return vocabulary.map(([wordVi, meaningJa, exampleVi, exampleJa, tag]) => ({
    learning_unit_id: learningUnitId,
    word_vi: wordVi,
    meaning_ja: meaningJa,
    example_vi: exampleVi,
    example_ja: exampleJa,
    tag,
    note: titleVi,
  }));
}

async function insertMissingVocabulary(learningUnit, vocabulary) {
  let inserted = 0;

  for (const item of buildVocabulary(vocabulary, learningUnit._id, learningUnit.title_vi)) {
    const exists = await VocabularyCard.exists({
      learning_unit_id: learningUnit._id,
      word_vi: item.word_vi,
    });
    if (exists) continue;

    await VocabularyCard.create(item);
    inserted += 1;
  }

  return inserted;
}

function buildTranscriptLines(unit, lessonId) {
  return unit.transcriptLines.map(([textVi, textJa], index) => ({
    lesson_id: lessonId,
    start_time: index * 6,
    end_time: index * 6 + 5,
    text_vi: textVi,
    text_ja: textJa,
    audio_url: null,
  }));
}

async function seedSupplementalUnit(unit) {
  const [place, level] = await Promise.all([
    Place.findOne({ name_vi: unit.placeVi }),
    Level.findOne({ code: unit.levelCode }),
  ]);

  if (!place || !level) {
    throw new Error(
      `Missing base data for ${unit.titleVi}. Run npm run seed:all first.`,
    );
  }

  const situation = await Situation.findOneAndUpdate(
    { place_id: place._id, title_vi: unit.situationVi },
    {
      $setOnInsert: {
        place_id: place._id,
        title_vi: unit.situationVi,
        title_ja: unit.situationJa,
        description: unit.situationVi,
      },
    },
    { returnDocument: 'after', upsert: true },
  );

  const learningUnit = await LearningUnit.findOneAndUpdate(
    { situation_id: situation._id, level_id: level._id },
    {
      $setOnInsert: {
        situation_id: situation._id,
        level_id: level._id,
        title_vi: unit.titleVi,
        title_ja: unit.titleJa,
        description: unit.situationVi,
      },
    },
    { returnDocument: 'after', upsert: true },
  );

  const listeningLesson = await ListeningLesson.findOneAndUpdate(
    { learning_unit_id: learningUnit._id },
    {
      $setOnInsert: {
        learning_unit_id: learningUnit._id,
        title_vi: unit.listeningTitleVi,
        title_ja: unit.listeningTitleJa,
        audio_url: fallbackAudioUrl,
        duration_seconds: unit.transcriptLines.length * 6,
        description: unit.situationVi,
      },
    },
    { returnDocument: 'after', upsert: true },
  );

  await TranscriptLine.deleteMany({ lesson_id: listeningLesson._id });
  await TranscriptLine.insertMany(buildTranscriptLines(unit, listeningLesson._id));

  const vocabularyInserted = await insertMissingVocabulary(
    learningUnit,
    unit.vocabulary,
  );

  return {
    title: unit.titleVi,
    vocabularyInserted,
    transcriptLines: unit.transcriptLines.length,
  };
}

async function seedSupplementalDataset() {
  await mongoose.connect(MONGO_URI);
  console.log(`Connected to ${mongoose.connection.db.databaseName}`);
  console.log('Seeding supplemental data only. Existing 4 seed files are not duplicated.');

  let insertedVocabulary = 0;

  for (const topUp of existingUnitVocabularyTopUps) {
    const learningUnit = await LearningUnit.findOne({ title_vi: topUp.titleVi });
    if (!learningUnit) {
      throw new Error(`Missing existing learning unit "${topUp.titleVi}". Run npm run seed:all first.`);
    }

    insertedVocabulary += await insertMissingVocabulary(
      learningUnit,
      topUp.vocabulary,
    );
  }

  const unitResults = [];
  for (const unit of supplementalUnits) {
    const result = await seedSupplementalUnit(unit);
    insertedVocabulary += result.vocabularyInserted;
    unitResults.push(result);
  }

  const counts = {
    places: await Place.countDocuments(),
    levels: await Level.countDocuments(),
    situations: await Situation.countDocuments(),
    learningUnits: await LearningUnit.countDocuments(),
    listeningLessons: await ListeningLesson.countDocuments(),
    transcriptLines: await TranscriptLine.countDocuments(),
    vocabularyCards: await VocabularyCard.countDocuments(),
  };

  console.table(unitResults);
  console.table(counts);
  console.log(`Inserted ${insertedVocabulary} new vocabulary cards.`);
  console.log('Supplemental dataset seeded successfully.');
}

seedSupplementalDataset()
  .catch((error) => {
    console.error('Supplemental dataset seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
