const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
} catch (error) {
  console.warn('dotenv not loaded. Set MONGO_URI in the environment if needed.');
}

const {
  User,
  Place,
  Level,
  Situation,
  LearningUnit,
  VocabularyCard,
  ListeningLesson,
  ListeningSession,
  TranscriptLine,
  UserProgress,
} = require('../models');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vietvibe_db';
const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: null },
    price: { type: Number, required: true },
    category: { type: String, default: null },
  },
  { timestamps: true },
);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const levels = [
  {
    code: 'A1',
    name_ja: '初級',
    name_vi: 'Sơ cấp',
    description: 'Nghe hiểu câu chào hỏi, mua bán và chỉ dẫn rất ngắn.',
  },
  {
    code: 'A2',
    name_ja: '初級後半',
    name_vi: 'Sơ cấp mở rộng',
    description: 'Nghe hiểu hội thoại chậm trong tình huống quen thuộc.',
  },
  {
    code: 'B1',
    name_ja: '中級',
    name_vi: 'Trung cấp',
    description: 'Nghe hiểu ý chính của hội thoại đời sống hằng ngày.',
  },
  {
    code: 'B2',
    name_ja: '中上級',
    name_vi: 'Trung cao cấp',
    description: 'Nghe hiểu hội thoại tự nhiên, có tốc độ vừa phải.',
  },
  {
    code: 'C1',
    name_ja: '上級',
    name_vi: 'Cao cấp',
    description: 'Nghe hiểu nội dung dài, nhiều sắc thái và hàm ý.',
  },
];

const places = [
  ['Siêu thị', 'スーパー', 'Mua sắm thực phẩm, hỏi giá và thanh toán.'],
  ['Nhà hàng', 'レストラン', 'Gọi món, đổi món, thanh toán và hỏi phục vụ.'],
  ['Bệnh viện', '病院', 'Mô tả triệu chứng, đặt lịch và nhận hướng dẫn.'],
  ['Bến xe', 'バスターミナル', 'Hỏi tuyến, mua vé và theo dõi giờ khởi hành.'],
  ['Tiệm làm đẹp', '美容室', 'Đặt lịch, mô tả kiểu tóc và hỏi giá dịch vụ.'],
  ['Ngân hàng', '銀行', 'Mở tài khoản, rút tiền, chuyển khoản và xác minh.'],
  ['Taxi', 'タクシー', 'Gọi xe, chỉ đường, hỏi giá và xử lý đồ thất lạc.'],
  ['Khách sạn', 'ホテル', 'Nhận phòng, hỏi tiện ích và nhờ hỗ trợ.'],
  ['Sân bay', '空港', 'Làm thủ tục, hỏi cổng bay và xử lý hành lý.'],
  ['Bưu điện', '郵便局', 'Gửi bưu phẩm, mua tem và hỏi phí chuyển phát.'],
];

const users = [
  ['admin', 'admin@vietvibe.com', 'admin123', 'SystemAdmin', 'VietVibe Admin'],
  ['learner', 'learner@vietvibe.com', 'learner123', 'Test Learner', 'Người học mẫu'],
  ['learner', 'sato@vietvibe.com', 'learner123', 'Sato Haruka', 'Sato Haruka'],
  ['learner', 'tanaka@vietvibe.com', 'learner123', 'Tanaka Ren', 'Tanaka Ren'],
  ['learner', 'yamada@vietvibe.com', 'learner123', 'Yamada Aoi', 'Yamada Aoi'],
  ['learner', 'suzuki@vietvibe.com', 'learner123', 'Suzuki Mina', 'Suzuki Mina'],
  ['learner', 'ito@vietvibe.com', 'learner123', 'Ito Kenta', 'Ito Kenta'],
  ['learner', 'nakamura@vietvibe.com', 'learner123', 'Nakamura Riku', 'Nakamura Riku'],
  ['learner', 'kobayashi@vietvibe.com', 'learner123', 'Kobayashi Yui', 'Kobayashi Yui'],
  ['learner', 'watanabe@vietvibe.com', 'learner123', 'Watanabe Sora', 'Watanabe Sora'],
];

const products = [
  ['Gói A1 Starter', 'Bộ bài luyện nghe nhập môn cho người mới bắt đầu.', 99000, 'course-pack'],
  ['Gói A2 Daily Life', 'Bộ hội thoại đời sống hằng ngày cấp A2.', 149000, 'course-pack'],
  ['Gói B1 Conversation', 'Bài nghe hội thoại tự nhiên cấp B1.', 199000, 'course-pack'],
  ['Gói B2 Workplace', 'Tình huống công việc, ngân hàng và dịch vụ.', 249000, 'course-pack'],
  ['Gói C1 Natural Speed', 'Bài nghe tốc độ tự nhiên cho người học nâng cao.', 299000, 'course-pack'],
  ['Flashcard Từ Vựng Nhà Hàng', 'Bộ flashcard chủ đề ăn uống và thanh toán.', 49000, 'vocabulary'],
  ['Flashcard Giao Thông', 'Bộ từ vựng taxi, xe buýt và sân bay.', 49000, 'vocabulary'],
  ['Transcript Premium', 'Gói phụ đề song ngữ có giải thích cụm từ.', 79000, 'addon'],
  ['Audio Offline Pack', 'Tải bài nghe về máy để học ngoại tuyến.', 89000, 'addon'],
  ['Admin Content Toolkit', 'Gói công cụ quản trị nội dung mẫu cho lớp học.', 129000, 'admin-tool'],
];

const situationTemplates = [
  ['Mua rau củ', '野菜を買う', 'Hỏi giá, số lượng và cách cân rau củ.', 'Siêu thị'],
  ['Thanh toán tại siêu thị', 'スーパーで会計する', 'Hỏi túi, điểm thành viên và phương thức trả tiền.', 'Siêu thị'],
  ['Gọi món cơ bản', '基本的な注文', 'Gọi món, hỏi thành phần và xác nhận khẩu phần.', 'Nhà hàng'],
  ['Thanh toán tại nhà hàng', 'レストランで会計する', 'Xin hóa đơn, chia tiền và hỏi thanh toán thẻ.', 'Nhà hàng'],
  ['Khám cảm cúm', '風邪の診察', 'Mô tả triệu chứng, thời gian đau và nhận thuốc.', 'Bệnh viện'],
  ['Mua vé xe buýt', 'バスの切符を買う', 'Hỏi giờ xe, điểm đến và giá vé.', 'Bến xe'],
  ['Cắt tóc nam', '男性のヘアカット', 'Mô tả độ dài, kiểu tóc và dịch vụ gội đầu.', 'Tiệm làm đẹp'],
  ['Rút tiền', '現金を引き出す', 'Rút tiền, hỏi phí và xác nhận số dư.', 'Ngân hàng'],
  ['Đi taxi về khách sạn', 'タクシーでホテルへ行く', 'Nói địa chỉ, hỏi lộ trình và giá ước tính.', 'Taxi'],
  ['Nhận phòng khách sạn', 'ホテルにチェックインする', 'Đưa giấy tờ, hỏi giờ ăn sáng và mật khẩu Wi-Fi.', 'Khách sạn'],
  ['Đổi phòng khách sạn', '部屋を変更する', 'Báo sự cố phòng và yêu cầu đổi phòng.', 'Khách sạn'],
  ['Làm thủ tục sân bay', '空港でチェックインする', 'Xuất trình hộ chiếu, gửi hành lý và nhận thẻ lên máy bay.', 'Sân bay'],
  ['Hỏi cổng lên máy bay', '搭乗口を聞く', 'Hỏi cổng, giờ lên máy bay và tình trạng chuyến bay.', 'Sân bay'],
  ['Gửi bưu phẩm', '荷物を送る', 'Gửi hàng, hỏi phí và thời gian giao.', 'Bưu điện'],
  ['Mua tem', '切手を買う', 'Mua tem, hỏi cách ghi địa chỉ và gửi thư.', 'Bưu điện'],
  ['Mở tài khoản', '口座を開設する', 'Điền form, xác minh giấy tờ và hỏi thẻ ATM.', 'Ngân hàng'],
  ['Báo mất đồ trên taxi', 'タクシーで忘れ物を届ける', 'Mô tả đồ thất lạc và thông tin chuyến đi.', 'Taxi'],
  ['Đặt món mang về', 'テイクアウトを注文する', 'Đặt món, hẹn giờ lấy và hỏi hộp đựng.', 'Nhà hàng'],
  ['Đổi thuốc ở nhà thuốc', '薬局で薬を交換する', 'Hỏi cách dùng thuốc và đổi thuốc không phù hợp.', 'Bệnh viện'],
  ['Hỏi đường trong thành phố', '街で道を聞く', 'Hỏi đường, mốc gần nhất và phương tiện phù hợp.', 'Bến xe'],
];

const learningUnitTemplates = [
  ['Bài 1: Hỏi giá rau củ', '第1課：野菜の値段を聞く', 'A1', 'Mua rau củ'],
  ['Bài 2: Thanh toán ở siêu thị', '第2課：スーパーで支払う', 'A1', 'Thanh toán tại siêu thị'],
  ['Bài 3: Gọi món phở', '第3課：フォーを注文する', 'A2', 'Gọi món cơ bản'],
  ['Bài 4: Xin hóa đơn', '第4課：領収書をもらう', 'A2', 'Thanh toán tại nhà hàng'],
  ['Bài 5: Nói triệu chứng', '第5課：症状を伝える', 'B1', 'Khám cảm cúm'],
  ['Bài 6: Hỏi tuyến xe', '第6課：バス路線を聞く', 'B1', 'Mua vé xe buýt'],
  ['Bài 7: Cắt ngắn một chút', '第7課：少し短く切る', 'B2', 'Cắt tóc nam'],
  ['Bài 8: Rút tiền ở quầy', '第8課：窓口で現金を引き出す', 'B2', 'Rút tiền'],
  ['Bài 9: Chỉ đường cho taxi', '第9課：タクシーで道案内する', 'C1', 'Đi taxi về khách sạn'],
  ['Bài 10: Nhận phòng', '第10課：チェックインする', 'C1', 'Nhận phòng khách sạn'],
];

const vocabularyByUnit = [
  [
    ['bao nhiêu', 'いくら', 'Cái này bao nhiêu tiền?', 'これはいくらですか。', 'Hỏi giá', 'shopping'],
    ['một ký', '1キロ', 'Cho tôi một ký cà chua.', 'トマトを1キロください。', 'Đơn vị cân', 'shopping'],
    ['tươi', '新鮮な', 'Rau này có tươi không?', 'この野菜は新鮮ですか。', 'Mô tả chất lượng', 'shopping'],
    ['rẻ hơn', 'もっと安い', 'Có loại nào rẻ hơn không?', 'もっと安いものはありますか。', 'So sánh giá', 'shopping'],
    ['cân giúp', '量ってください', 'Cô cân giúp tôi túi này.', 'これを量ってください。', 'Nhờ hỗ trợ', 'shopping'],
    ['hết rồi', '売り切れです', 'Rau thơm hết rồi.', '香草は売り切れです。', 'Tình trạng hàng', 'shopping'],
    ['lấy thêm', '追加で取る', 'Tôi lấy thêm hai quả chanh.', 'ライムをあと2個ください。', 'Mua thêm', 'shopping'],
    ['túi nilon', 'ビニール袋', 'Cho tôi một túi nilon.', 'ビニール袋を一枚ください。', 'Đồ dùng', 'shopping'],
  ],
  [
    ['thanh toán', '支払う', 'Tôi muốn thanh toán.', '支払いたいです。', 'Tại quầy', 'checkout'],
    ['tiền mặt', '現金', 'Tôi trả bằng tiền mặt.', '現金で払います。', 'Phương thức trả tiền', 'checkout'],
    ['thẻ', 'カード', 'Có thanh toán bằng thẻ được không?', 'カードで払えますか。', 'Phương thức trả tiền', 'checkout'],
    ['hóa đơn', 'レシート', 'Cho tôi xin hóa đơn.', 'レシートをください。', 'Sau thanh toán', 'checkout'],
    ['túi riêng', '別の袋', 'Cho tôi túi riêng.', '別の袋をください。', 'Đóng gói', 'checkout'],
    ['điểm thành viên', '会員ポイント', 'Tôi có thẻ thành viên.', '会員カードがあります。', 'Thẻ thành viên', 'checkout'],
    ['mã giảm giá', '割引コード', 'Tôi dùng mã giảm giá này.', 'この割引コードを使います。', 'Khuyến mãi', 'checkout'],
    ['tổng cộng', '合計', 'Tổng cộng bao nhiêu tiền?', '合計はいくらですか。', 'Xác nhận số tiền', 'checkout'],
  ],
  [
    ['gọi món', '注文する', 'Tôi muốn gọi món.', '注文したいです。', 'Nhà hàng', 'restaurant'],
    ['phở bò', '牛肉フォー', 'Cho tôi một tô phở bò.', '牛肉フォーを一杯ください。', 'Món ăn', 'restaurant'],
    ['ít hành', 'ネギ少なめ', 'Cho tôi ít hành.', 'ネギ少なめでお願いします。', 'Tùy chỉnh món', 'restaurant'],
    ['không cay', '辛くない', 'Món này không cay được không?', '辛くしないでできますか。', 'Khẩu vị', 'restaurant'],
    ['nước lọc', '水', 'Cho tôi nước lọc.', '水をください。', 'Đồ uống', 'restaurant'],
    ['thực đơn', 'メニュー', 'Cho tôi xem thực đơn.', 'メニューを見せてください。', 'Gọi phục vụ', 'restaurant'],
    ['đợi một chút', '少し待つ', 'Tôi đợi một chút.', '少し待ちます。', 'Phản hồi', 'restaurant'],
    ['mang ra', '持ち帰り', 'Món này mang ra được không?', 'これは持ち帰りできますか。', 'Mang đi', 'restaurant'],
  ],
  [
    ['tính tiền', '会計する', 'Cho tôi tính tiền.', 'お会計をお願いします。', 'Thanh toán', 'restaurant'],
    ['chia hóa đơn', '割り勘する', 'Chúng tôi muốn chia hóa đơn.', '別々に払いたいです。', 'Đi nhóm', 'restaurant'],
    ['phí phục vụ', 'サービス料', 'Có phí phục vụ không?', 'サービス料はありますか。', 'Hỏi phí', 'restaurant'],
    ['thẻ tín dụng', 'クレジットカード', 'Ở đây nhận thẻ tín dụng không?', 'クレジットカードは使えますか。', 'Thanh toán', 'restaurant'],
    ['tiền thừa', 'おつり', 'Tôi chưa nhận tiền thừa.', 'おつりをまだ受け取っていません。', 'Sau thanh toán', 'restaurant'],
    ['hóa đơn đỏ', '正式な領収書', 'Tôi cần hóa đơn đỏ.', '正式な領収書が必要です。', 'Công việc', 'restaurant'],
    ['quẹt thẻ', 'カードを通す', 'Tôi sẽ quẹt thẻ.', 'カードで払います。', 'Thanh toán', 'restaurant'],
    ['cảm ơn', 'ありがとう', 'Cảm ơn, đồ ăn rất ngon.', 'ありがとうございます。料理がおいしかったです。', 'Kết thúc', 'restaurant'],
  ],
  [
    ['đau đầu', '頭が痛い', 'Tôi bị đau đầu.', '頭が痛いです。', 'Triệu chứng', 'hospital'],
    ['sốt', '熱', 'Tôi bị sốt từ hôm qua.', '昨日から熱があります。', 'Triệu chứng', 'hospital'],
    ['ho', '咳', 'Tôi ho nhiều vào buổi tối.', '夜によく咳が出ます。', 'Triệu chứng', 'hospital'],
    ['dị ứng', 'アレルギー', 'Tôi bị dị ứng thuốc này.', 'この薬にアレルギーがあります。', 'Lưu ý y tế', 'hospital'],
    ['đơn thuốc', '処方箋', 'Tôi nhận đơn thuốc ở đâu?', '処方箋はどこでもらえますか。', 'Sau khám', 'hospital'],
    ['uống thuốc', '薬を飲む', 'Thuốc này uống sau ăn.', 'この薬は食後に飲みます。', 'Hướng dẫn', 'hospital'],
    ['tái khám', '再診', 'Khi nào tôi cần tái khám?', 'いつ再診が必要ですか。', 'Lịch hẹn', 'hospital'],
    ['bảo hiểm', '保険', 'Bảo hiểm có dùng được không?', '保険は使えますか。', 'Thủ tục', 'hospital'],
  ],
  [
    ['vé xe', 'バス券', 'Tôi muốn mua vé xe.', 'バスの切符を買いたいです。', 'Mua vé', 'transport'],
    ['chuyến mấy giờ', '何時の便', 'Chuyến tiếp theo mấy giờ?', '次の便は何時ですか。', 'Hỏi giờ', 'transport'],
    ['đi Đà Nẵng', 'ダナン行き', 'Có xe đi Đà Nẵng không?', 'ダナン行きのバスはありますか。', 'Điểm đến', 'transport'],
    ['ghế ngồi', '座席', 'Tôi muốn ghế gần cửa sổ.', '窓側の席がいいです。', 'Chọn chỗ', 'transport'],
    ['bến số', '乗り場番号', 'Xe đi ở bến số mấy?', '何番乗り場ですか。', 'Hướng dẫn', 'transport'],
    ['trễ chuyến', '遅れる', 'Xe có bị trễ không?', 'バスは遅れていますか。', 'Tình trạng', 'transport'],
    ['hành lý', '荷物', 'Tôi gửi hành lý ở đâu?', '荷物はどこに預けますか。', 'Hành lý', 'transport'],
    ['đổi vé', '切符を変更する', 'Tôi muốn đổi vé.', '切符を変更したいです。', 'Thay đổi', 'transport'],
  ],
  [
    ['cắt tóc', '髪を切る', 'Tôi muốn cắt tóc.', '髪を切りたいです。', 'Dịch vụ', 'beauty'],
    ['ngắn hơn', 'もっと短く', 'Cắt ngắn hơn một chút.', '少し短くしてください。', 'Yêu cầu', 'beauty'],
    ['giữ nguyên', 'そのまま', 'Giữ nguyên phần mái.', '前髪はそのままでお願いします。', 'Yêu cầu', 'beauty'],
    ['gội đầu', 'シャンプー', 'Có gội đầu không?', 'シャンプーはありますか。', 'Dịch vụ', 'beauty'],
    ['nhuộm tóc', '髪を染める', 'Tôi muốn nhuộm màu nâu.', '茶色に染めたいです。', 'Dịch vụ', 'beauty'],
    ['đặt lịch', '予約する', 'Tôi đã đặt lịch lúc ba giờ.', '3時に予約しています。', 'Lịch hẹn', 'beauty'],
    ['bao lâu', 'どのくらい', 'Dịch vụ này mất bao lâu?', 'このサービスはどのくらいかかりますか。', 'Thời gian', 'beauty'],
    ['giá dịch vụ', '料金', 'Giá dịch vụ là bao nhiêu?', '料金はいくらですか。', 'Giá', 'beauty'],
  ],
  [
    ['rút tiền', 'お金を引き出す', 'Tôi muốn rút tiền.', 'お金を引き出したいです。', 'Ngân hàng', 'bank'],
    ['số dư', '残高', 'Tôi muốn kiểm tra số dư.', '残高を確認したいです。', 'Tài khoản', 'bank'],
    ['chuyển khoản', '振り込み', 'Tôi muốn chuyển khoản.', '振り込みをしたいです。', 'Giao dịch', 'bank'],
    ['phí giao dịch', '手数料', 'Phí giao dịch là bao nhiêu?', '手数料はいくらですか。', 'Chi phí', 'bank'],
    ['giấy tờ tùy thân', '身分証明書', 'Tôi cần giấy tờ gì?', 'どんな身分証明書が必要ですか。', 'Thủ tục', 'bank'],
    ['mã PIN', '暗証番号', 'Tôi quên mã PIN.', '暗証番号を忘れました。', 'Bảo mật', 'bank'],
    ['ký tên', '署名する', 'Tôi ký tên ở đâu?', 'どこに署名しますか。', 'Biểu mẫu', 'bank'],
    ['biên lai', '控え', 'Cho tôi xin biên lai.', '控えをください。', 'Sau giao dịch', 'bank'],
  ],
  [
    ['địa chỉ', '住所', 'Đây là địa chỉ khách sạn.', 'これがホテルの住所です。', 'Taxi', 'taxi'],
    ['đi thẳng', 'まっすぐ行く', 'Anh đi thẳng giúp tôi.', 'まっすぐ行ってください。', 'Chỉ đường', 'taxi'],
    ['rẽ trái', '左に曲がる', 'Đến ngã tư thì rẽ trái.', '交差点で左に曲がってください。', 'Chỉ đường', 'taxi'],
    ['dừng ở đây', 'ここで止める', 'Anh dừng ở đây giúp tôi.', 'ここで止めてください。', 'Xuống xe', 'taxi'],
    ['bao lâu', 'どのくらい', 'Đến đó mất bao lâu?', 'そこまでどのくらいかかりますか。', 'Thời gian', 'taxi'],
    ['kẹt xe', '渋滞', 'Đường này có kẹt xe không?', 'この道は渋滞していますか。', 'Tình trạng đường', 'taxi'],
    ['đồng hồ', 'メーター', 'Anh bật đồng hồ giúp tôi.', 'メーターをつけてください。', 'Giá cước', 'taxi'],
    ['tiền tip', 'チップ', 'Có cần tiền tip không?', 'チップは必要ですか。', 'Văn hóa', 'taxi'],
  ],
  [
    ['nhận phòng', 'チェックイン', 'Tôi muốn nhận phòng.', 'チェックインしたいです。', 'Khách sạn', 'hotel'],
    ['đặt phòng', '予約', 'Tôi đã đặt phòng trước.', '予約しています。', 'Khách sạn', 'hotel'],
    ['hộ chiếu', 'パスポート', 'Đây là hộ chiếu của tôi.', 'これが私のパスポートです。', 'Giấy tờ', 'hotel'],
    ['ăn sáng', '朝食', 'Ăn sáng bắt đầu lúc mấy giờ?', '朝食は何時からですか。', 'Tiện ích', 'hotel'],
    ['mật khẩu Wi-Fi', 'Wi-Fiのパスワード', 'Cho tôi mật khẩu Wi-Fi.', 'Wi-Fiのパスワードを教えてください。', 'Tiện ích', 'hotel'],
    ['trả phòng', 'チェックアウト', 'Tôi trả phòng lúc mấy giờ?', 'チェックアウトは何時ですか。', 'Khách sạn', 'hotel'],
    ['phòng yên tĩnh', '静かな部屋', 'Tôi muốn phòng yên tĩnh.', '静かな部屋がいいです。', 'Yêu cầu', 'hotel'],
    ['gửi hành lý', '荷物を預ける', 'Tôi gửi hành lý được không?', '荷物を預けられますか。', 'Dịch vụ', 'hotel'],
  ],
];

const transcriptLinesByUnit = [
  [
    ['Chị ơi, rau muống này bao nhiêu một bó?', 'すみません、この空心菜は一束いくらですか。'],
    ['Một bó mười lăm nghìn em nhé.', '一束1万5千ドンです。'],
    ['Rau có tươi không chị?', '野菜は新鮮ですか。'],
    ['Tươi lắm, mới nhập sáng nay.', 'とても新鮮です。今朝入ったばかりです。'],
    ['Vậy cho em hai bó.', 'では二束ください。'],
    ['Em có cần túi không?', '袋は必要ですか。'],
  ],
  [
    ['Em thanh toán bằng thẻ được không ạ?', 'カードで支払えますか。'],
    ['Dạ được, chị đưa thẻ giúp em.', 'はい、カードをお願いします。'],
    ['Em có thẻ thành viên không?', '会員カードはありますか。'],
    ['Dạ có, em đọc số điện thoại được không?', 'あります。電話番号でいいですか。'],
    ['Tổng cộng là một trăm hai mươi nghìn.', '合計12万ドンです。'],
    ['Cho em xin hóa đơn nhé.', 'レシートをください。'],
  ],
  [
    ['Em ơi, cho anh xem thực đơn.', 'すみません、メニューを見せてください。'],
    ['Dạ, anh muốn dùng món gì ạ?', 'はい、何を召し上がりますか。'],
    ['Cho anh một phở bò, ít hành.', '牛肉フォーを一つ、ネギ少なめでください。'],
    ['Anh có dùng nước gì không?', '飲み物はいかがですか。'],
    ['Cho anh một ly nước lọc.', '水を一杯ください。'],
    ['Dạ, anh đợi một chút ạ.', 'はい、少々お待ちください。'],
  ],
  [
    ['Em ơi, cho anh tính tiền.', 'すみません、お会計をお願いします。'],
    ['Dạ, anh dùng tiền mặt hay thẻ ạ?', '現金ですか、カードですか。'],
    ['Anh trả bằng thẻ tín dụng.', 'クレジットカードで払います。'],
    ['Anh cần hóa đơn không ạ?', '領収書は必要ですか。'],
    ['Có, cho anh xin hóa đơn công ty.', 'はい、会社名の領収書をください。'],
    ['Dạ, anh ký tên ở đây giúp em.', 'こちらに署名をお願いします。'],
  ],
  [
    ['Chào bác sĩ, tôi bị sốt từ hôm qua.', '先生、昨日から熱があります。'],
    ['Anh có ho hoặc đau họng không?', '咳や喉の痛みはありますか。'],
    ['Có, tôi ho nhiều vào buổi tối.', 'はい、夜によく咳が出ます。'],
    ['Anh có dị ứng thuốc gì không?', '薬のアレルギーはありますか。'],
    ['Tôi không chắc lắm.', 'よく分かりません。'],
    ['Tôi sẽ kê đơn thuốc trong ba ngày.', '三日分の薬を処方します。'],
  ],
  [
    ['Cho tôi hỏi xe đi Đà Nẵng ở bến số mấy?', 'ダナン行きのバスは何番乗り場ですか。'],
    ['Bến số năm, chuyến tiếp theo lúc tám giờ.', '5番乗り場です。次は8時です。'],
    ['Tôi muốn mua một vé ghế gần cửa sổ.', '窓側の席を一枚ください。'],
    ['Anh có mang hành lý lớn không?', '大きな荷物はありますか。'],
    ['Có một vali.', 'スーツケースが一つあります。'],
    ['Anh gửi vali ở quầy bên kia nhé.', 'あちらのカウンターで預けてください。'],
  ],
  [
    ['Chào anh, tôi đã đặt lịch lúc ba giờ.', 'こんにちは、3時に予約しています。'],
    ['Anh muốn cắt như thế nào?', 'どのように切りますか。'],
    ['Cắt ngắn hơn một chút, giữ nguyên phần mái.', '少し短くして、前髪はそのままで。'],
    ['Anh có muốn gội đầu không?', 'シャンプーはしますか。'],
    ['Có, gội đầu giúp tôi.', 'はい、お願いします。'],
    ['Dịch vụ này mất khoảng bốn mươi phút.', 'このサービスは約40分かかります。'],
  ],
  [
    ['Tôi muốn rút tiền từ tài khoản.', '口座からお金を引き出したいです。'],
    ['Anh vui lòng đưa giấy tờ tùy thân.', '身分証明書をお願いします。'],
    ['Đây là hộ chiếu của tôi.', 'これが私のパスポートです。'],
    ['Anh muốn rút bao nhiêu?', 'いくら引き出しますか。'],
    ['Tôi muốn rút hai triệu đồng.', '200万ドン引き出したいです。'],
    ['Anh ký tên ở đây và nhận biên lai.', 'こちらに署名して控えを受け取ってください。'],
  ],
  [
    ['Anh ơi, cho tôi về khách sạn này.', 'このホテルまでお願いします。'],
    ['Dạ, khoảng hai mươi phút nếu không kẹt xe.', '渋滞がなければ約20分です。'],
    ['Anh bật đồng hồ giúp tôi nhé.', 'メーターをつけてください。'],
    ['Dạ được.', 'はい。'],
    ['Đến ngã tư thì rẽ trái.', '交差点で左に曲がってください。'],
    ['Tôi dừng ở cổng khách sạn nhé?', 'ホテルの入口で止めますか。'],
  ],
  [
    ['Xin chào, tôi muốn nhận phòng.', 'こんにちは、チェックインしたいです。'],
    ['Anh đã đặt phòng trước chưa?', '予約はありますか。'],
    ['Có, tên tôi là Sato.', 'はい、佐藤です。'],
    ['Anh cho tôi xem hộ chiếu nhé.', 'パスポートを見せてください。'],
    ['Ăn sáng bắt đầu lúc mấy giờ?', '朝食は何時からですか。'],
    ['Từ sáu giờ rưỡi đến chín giờ.', '6時半から9時までです。'],
  ],
];

const unitTopics = [
  ['Hỏi giá rau củ', '野菜の値段を聞く'],
  ['Thanh toán ở siêu thị', 'スーパーで支払う'],
  ['Gọi món phở', 'フォーを注文する'],
  ['Xin hóa đơn', '領収書をもらう'],
  ['Nói triệu chứng', '症状を伝える'],
  ['Hỏi tuyến xe', 'バス路線を聞く'],
  ['Cắt ngắn một chút', '少し短く切る'],
  ['Rút tiền ở quầy', '窓口で現金を引き出す'],
  ['Chỉ đường cho taxi', 'タクシーで道案内する'],
  ['Nhận phòng', 'チェックインする'],
  ['Đổi phòng', '部屋を変更する'],
  ['Làm thủ tục bay', '空港でチェックインする'],
  ['Hỏi cổng bay', '搭乗口を聞く'],
  ['Gửi bưu phẩm', '荷物を送る'],
  ['Mua tem gửi thư', '切手を買って手紙を送る'],
  ['Mở tài khoản', '口座を開設する'],
  ['Báo mất đồ', '忘れ物を届ける'],
  ['Đặt món mang về', 'テイクアウトを注文する'],
  ['Đổi thuốc', '薬を交換する'],
  ['Hỏi đường', '道を聞く'],
  ['Hỏi khuyến mãi', '割引を聞く'],
  ['Đặt bàn', '席を予約する'],
  ['Hỏi lịch tái khám', '再診の予約を聞く'],
  ['Đổi vé xe', 'バス券を変更する'],
  ['Gọi lễ tân hỗ trợ', 'フロントに相談する'],
  ['Hỏi hành lý thất lạc', '紛失荷物を問い合わせる'],
  ['Gửi chuyển phát nhanh', '速達で送る'],
  ['Lấy số thứ tự', '番号札を取る'],
  ['Hỏi giờ đóng cửa', '閉店時間を聞く'],
  ['Xử lý thanh toán lỗi', '支払いエラーに対応する'],
];

function buildLearningUnitSeeds() {
  return unitTopics.map(([topicVi, topicJa], index) => {
    const situation = situationTemplates[Math.floor(index / levels.length) % situationTemplates.length];
    const level = levels[index % levels.length];

    return {
      title_vi: `Bài ${index + 1}: ${topicVi}`,
      title_ja: `第${index + 1}課：${topicJa}`,
      description: `Luyện nghe tiếng Việt qua tình huống: ${situation[0]}.`,
      levelCode: level.code,
      situationTitle: situation[0],
    };
  });
}

function buildVocabularyForUnit(unit, unitIndex) {
  const baseWords = vocabularyByUnit[unitIndex % vocabularyByUnit.length];
  const extraWords = [
    ['xin lỗi', 'すみません', 'Xin lỗi, tôi muốn hỏi một chút.', 'すみません、少し聞きたいです。', 'Mở đầu lịch sự', 'polite'],
    ['giúp tôi', '手伝ってください', 'Anh giúp tôi được không?', '手伝っていただけますか。', 'Nhờ hỗ trợ', 'polite'],
    ['ở đâu', 'どこ', 'Quầy thanh toán ở đâu?', 'レジはどこですか。', 'Hỏi vị trí', 'question'],
    ['khi nào', 'いつ', 'Khi nào có chuyến tiếp theo?', '次の便はいつですか。', 'Hỏi thời gian', 'question'],
    ['bao lâu', 'どのくらい', 'Đến đó mất bao lâu?', 'そこまでどのくらいかかりますか。', 'Hỏi thời lượng', 'question'],
    ['đổi được không', '変更できますか', 'Tôi đổi lịch được không?', '予定を変更できますか。', 'Yêu cầu thay đổi', 'request'],
  ];

  return [...baseWords, ...extraWords].map(
    ([word_vi, meaning_ja, example_vi, example_ja, note, tag], wordIndex) => ({
      learning_unit_id: unit._id,
      word_vi: `${word_vi}${wordIndex >= baseWords.length ? ` ${unitIndex + 1}` : ''}`,
      meaning_ja,
      example_vi,
      example_ja,
      note,
      tag,
    }),
  );
}

function buildTranscriptForLesson(lesson, lessonIndex) {
  const baseLines = transcriptLinesByUnit[lessonIndex % transcriptLinesByUnit.length];
  const extraLines = [
    ['Tôi nghe chưa rõ, anh nói lại giúp tôi được không?', 'よく聞こえませんでした。もう一度言っていただけますか。'],
    ['Dạ được, tôi sẽ nói chậm hơn một chút.', 'はい、少しゆっくり言います。'],
  ];

  return [...baseLines, ...extraLines].map(([text_vi, text_ja], lineIndex) => ({
    lesson_id: lesson._id,
    start_time: lineIndex * 4,
    end_time: lineIndex * 4 + 3,
    text_vi,
    text_ja,
  }));
}

async function seedUsers() {
  const createdUsers = [];

  for (const [role, email, password, user_name, full_name] of users) {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      createdUsers.push(existingUser);
      continue;
    }

    createdUsers.push(
      await User.create({
        role,
        email,
        password_hash: await bcrypt.hash(password, 12),
        user_name,
        full_name,
        avatar_url: `/avatars/${email.split('@')[0]}.png`,
      }),
    );
  }

  return createdUsers;
}

async function findOrCreate(model, filter, payload) {
  const existing = await model.findOne(filter);
  if (existing) {
    return existing;
  }

  return model.create(payload);
}

async function seedManyWithFindOrCreate(items, createOne) {
  const created = [];

  for (const item of items) {
    created.push(await createOne(item));
  }

  return created;
}

async function seedRichData() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');

  console.log('Seeding users, levels, places without deleting existing data...');
  const createdUsers = await seedUsers();
  const createdLevels = await seedManyWithFindOrCreate(levels, (level) =>
    findOrCreate(Level, { code: level.code }, level),
  );
  const createdPlaces = await seedManyWithFindOrCreate(
    places.map(([name_vi, name_ja, description]) => ({
        name_vi,
        name_ja,
        description,
        avatar_url: `/places/${name_vi.toLowerCase().replace(/\s+/g, '-')}.png`,
      })),
    (place) => findOrCreate(Place, { name_vi: place.name_vi }, place),
  );
  await seedManyWithFindOrCreate(
    products.map(([name, description, price, category]) => ({
      name,
      description,
      price,
      category,
    })),
    (product) => findOrCreate(Product, { name: product.name }, product),
  );

  const placeByName = Object.fromEntries(createdPlaces.map((place) => [place.name_vi, place]));
  const levelByCode = Object.fromEntries(createdLevels.map((level) => [level.code, level]));

  console.log('Seeding situations...');
  const createdSituations = await seedManyWithFindOrCreate(
    situationTemplates.map(([title_vi, title_ja, description, placeName]) => ({
      title_vi,
      title_ja,
      description,
      place_id: placeByName[placeName]._id,
    })),
    (situation) => findOrCreate(Situation, { title_vi: situation.title_vi }, situation),
  );
  const situationByTitle = Object.fromEntries(
    createdSituations.map((situation) => [situation.title_vi, situation]),
  );

  console.log('Seeding learning units...');
  const learningUnitSeeds = buildLearningUnitSeeds();
  const createdLearningUnits = await seedManyWithFindOrCreate(
    learningUnitSeeds.map((unit) => ({
      title_vi: unit.title_vi,
      title_ja: unit.title_ja,
      description: unit.description,
      level_id: levelByCode[unit.levelCode]._id,
      situation_id: situationByTitle[unit.situationTitle]._id,
    })),
    (unit) =>
      findOrCreate(
        LearningUnit,
        { situation_id: unit.situation_id, level_id: unit.level_id },
        unit,
      ),
  );

  console.log('Seeding vocabulary cards...');
  const vocabularyPayload = createdLearningUnits.flatMap((unit, unitIndex) =>
    buildVocabularyForUnit(unit, unitIndex),
  );
  const createdVocabularyCards = await seedManyWithFindOrCreate(
    vocabularyPayload,
    (card) =>
      findOrCreate(
        VocabularyCard,
        { learning_unit_id: card.learning_unit_id, word_vi: card.word_vi },
        card,
      ),
  );

  console.log('Seeding listening lessons and transcript lines...');
  const createdListeningLessons = await seedManyWithFindOrCreate(
    createdLearningUnits.map((unit, index) => ({
      learning_unit_id: unit._id,
      title_vi: `Bài nghe ${index + 1}: ${unit.title_vi.replace(/^Bài \d+:\s*/, '')}`,
      title_ja: `リスニング${index + 1}: ${unit.title_ja.replace(/^第\d+課：/, '')}`,
      audio_url: `/audios/listening-${String(index + 1).padStart(2, '0')}.mp3`,
      duration_seconds: 45 + index * 8,
      description: `Hội thoại mẫu cho ${unit.title_vi}.`,
    })),
    (lesson) => findOrCreate(ListeningLesson, { learning_unit_id: lesson.learning_unit_id }, lesson),
  );

  const transcriptPayload = createdListeningLessons.flatMap((lesson, lessonIndex) =>
    buildTranscriptForLesson(lesson, lessonIndex),
  );
  const createdTranscriptLines = await seedManyWithFindOrCreate(
    transcriptPayload,
    (line) =>
      findOrCreate(
        TranscriptLine,
        { lesson_id: line.lesson_id, start_time: line.start_time, text_vi: line.text_vi },
        line,
      ),
  );

  console.log('Seeding user progress...');
  const learnerUsers = createdUsers.filter((user) => user.role === 'learner');
  const progressPayload = [];

  learnerUsers.forEach((user, userIndex) => {
    createdLearningUnits.slice(0, 7).forEach((unit, unitOffset) => {
      const unitCards = createdVocabularyCards.filter(
        (card) => String(card.learning_unit_id) === String(unit._id),
      );
      const lesson = createdListeningLessons.find(
        (item) => String(item.learning_unit_id) === String(unit._id),
      );
      const completed = (userIndex + unitOffset) % 3 === 0;

      progressPayload.push({
        user_id: user._id,
        learning_unit_id: unit._id,
        vocabulary_progress: {
          viewed_card_ids: unitCards.slice(0, 3 + ((userIndex + unitOffset) % 4)).map((card) => card._id),
          completed,
          completed_at: completed ? new Date() : null,
        },
        listening_progress: {
          lesson_id: lesson._id,
          last_position_seconds: completed ? lesson.duration_seconds : 8 + userIndex * 3,
          completed,
          completed_at: completed ? new Date() : null,
        },
      });
    });
  });
  const createdProgress = await seedManyWithFindOrCreate(
    progressPayload,
    (progress) =>
      findOrCreate(
        UserProgress,
        { user_id: progress.user_id, learning_unit_id: progress.learning_unit_id },
        progress,
      ),
  );

  console.log('Seeding listening sessions...');
  const existingSessionCount = await ListeningSession.countDocuments();
  const sessionSlots = Math.max(0, 50 - existingSessionCount);
  const sessionPayload = createdProgress.slice(0, sessionSlots).map((progress, index) => {
    const lesson = createdListeningLessons.find(
      (item) => String(item._id) === String(progress.listening_progress.lesson_id),
    );
    const lessonLines = createdTranscriptLines.filter(
      (line) => String(line.lesson_id) === String(lesson._id),
    );
    const completed = index % 4 === 0;

    return {
      user_id: progress.user_id,
      lesson_id: lesson._id,
      learning_unit_id: progress.learning_unit_id,
      playback_speed: index % 2 === 0 ? 1 : 0.75,
      playback_mode: index % 3 === 0 ? 'continuous' : 'study',
      ambient_sound: ['cafe', 'road', 'market', 'office', null][index % 5],
      ambient_volume: 25 + ((index * 5) % 76),
      last_position_seconds: completed ? lesson.duration_seconds : 6 + index * 4,
      current_transcript_line_id: completed ? null : lessonLines[index % lessonLines.length]._id,
      completed,
      completed_at: completed ? new Date() : null,
      ended_at: completed ? new Date() : null,
    };
  });
  if (sessionPayload.length > 0) {
    await ListeningSession.insertMany(sessionPayload);
  }

  const counts = {
    users: await User.countDocuments(),
    levels: await Level.countDocuments(),
    places: await Place.countDocuments(),
    situations: await Situation.countDocuments(),
    learningUnits: await LearningUnit.countDocuments(),
    vocabularyCards: await VocabularyCard.countDocuments(),
    listeningLessons: await ListeningLesson.countDocuments(),
    transcriptLines: await TranscriptLine.countDocuments(),
    userProgress: await UserProgress.countDocuments(),
    listeningSessions: await ListeningSession.countDocuments(),
    products: await Product.countDocuments(),
  };

  console.log('Seed completed.');
  console.table(counts);
  console.log('Admin login: admin@vietvibe.com / admin123');
  console.log('Learner login: learner@vietvibe.com / learner123');
}

seedRichData()
  .catch((error) => {
    console.error('Rich seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  });
