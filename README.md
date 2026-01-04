# 🤖 AURABOT - Facebook Chat Bot LTS v1.0.0

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)
![Status](https://img.shields.io/badge/status-LTS-success.svg)

> **AURABOT** là một Facebook Chat Bot được xây dựng bằng TypeScript với hệ thống quản lý lệnh linh hoạt, ổn định và đủ tính năng để sử dụng lâu dài.

## ✨ Tính năng nổi bật

### 🚀 Core & Performance
- ⚡ **SQLite WAL Mode**: Tối ưu hiệu năng đọc/ghi song song
- 🛡️ **Rate Limiting & Anti-Spam**: Bảo vệ bot khỏi spam và checkpoint
- 📨 **Message Queue**: Quản lý hàng đợi tin nhắn để tránh spam
- 🔧 **Environment Variables**: Hỗ trợ `.env` với validation bằng Zod
- 🛠️ **Global Error Handler**: Xử lý lỗi toàn cục và graceful shutdown

### 🎮 Tính năng phong phú
- 📥 **Media Downloader**: Tải video từ TikTok, YouTube, Facebook
- 💰 **Economy System**: Banking, Gambling (Tài xỉu, Bầu cua), Rob system
- 👥 **Group Management**: Anti-out, Anti-change-info, Warn system
- 🤖 **AI Integration**: Tích hợp Gemini AI để chat thông minh
- 🎨 **Rank Card**: Tạo card rank đẹp mắt với Canvas
- 📄 **Paginated Menu**: Menu lệnh có phân trang

### 💻 Developer Experience
- 📝 **Winston Logger**: Logging chuyên nghiệp với log rotation
- 🐳 **Docker Support**: Dockerfile và docker-compose.yml sẵn sàng
- ✅ **Unit Tests**: Jest setup với test examples
- 📚 **Comprehensive Docs**: Tài liệu đầy đủ và dễ hiểu

## 📋 Yêu cầu

- **Node.js** >= 18.x
- **npm** hoặc **yarn**
- **TypeScript** >= 5.0.0
- **Docker** (tùy chọn, nếu dùng Docker)

## 🚀 Cài đặt nhanh

### Cách 1: Sử dụng Docker (Khuyến nghị)

```bash
# Clone repository
git clone https://github.com/dongp06/AURABOT.git
cd AURABOT

# Copy và chỉnh sửa .env
cp env.example .env
# Chỉnh sửa .env với thông tin của bạn

# Build và chạy
docker-compose up -d
```

### Cách 2: Cài đặt thủ công

```bash
# Clone repository
git clone https://github.com/dongp06/AURABOT.git
cd AURABOT

# Cài đặt dependencies
npm install

# Cấu hình
cp env.example .env
# Hoặc copy config.example.json thành config.json

# Chỉnh sửa .env hoặc config.json
# - Thêm OWNER_ID
# - Thêm GEMINI_API_KEY (tùy chọn)
# - Cấu hình các thông số khác

# Chạy bot
npm run dev  # Development mode
# hoặc
npm start    # Production mode
```

## ⚙️ Cấu hình

### Sử dụng .env (Khuyến nghị)

Tạo file `.env` từ `env.example`:

```env
# Bot Configuration
BOT_PREFIX=!
BOT_NAME=AURABOT

# Permissions
OWNER_ID=YOUR_OWNER_ID
ADMIN_IDS=

# AI Configuration (optional)
GEMINI_API_KEY=your_gemini_api_key

# Logger
LOG_LEVEL=info
```

### Sử dụng config.json (Legacy)

File `config.json` vẫn được hỗ trợ để tương thích ngược:

```json
{
  "bot": {
    "prefix": "!",
    "name": "AURABOT"
  },
  "permissions": {
    "owner": "YOUR_OWNER_ID",
    "admins": []
  }
}
```

## 📁 Cấu trúc dự án

```
AURABOT/
├── main/                    # Source code chính
│   ├── config/             # Config management
│   │   └── env.ts          # Environment variables với Zod validation
│   ├── database/           # Database
│   │   ├── models/         # Sequelize models
│   │   ├── controllers/    # Database controllers
│   │   └── sequelize.ts    # SQLite với WAL mode
│   ├── handlers/           # Event handlers
│   ├── utils/              # Utilities
│   │   ├── rateLimit.ts    # Rate limiting system
│   │   ├── messageQueue.ts # Message queue
│   │   ├── ai.ts           # Gemini AI integration
│   │   └── loggerWinston.ts # Winston logger
│   └── Aura.ts             # Entry point với error handling
├── scripts/
│   ├── commands/           # Commands
│   │   ├── admin/          # Admin commands
│   │   ├── fun/            # Fun commands
│   │   ├── media/          # Media downloader commands
│   │   └── system/          # System commands
│   └── events/             # Event handlers
├── logs/                   # Log files (auto-generated)
├── storage/                # Database storage
├── Dockerfile              # Docker configuration
├── docker-compose.yml      # Docker Compose
└── jest.config.js          # Jest test configuration
```

## 🎮 Danh sách lệnh

### 📥 Media Commands
- `!tiktok <link>` - Tải video TikTok không logo
- `!youtube <link> [audio]` - Tải video/audio YouTube
- `!facebook <link>` - Tải video Facebook

### 💰 Economy Commands
- `!balance` - Xem số dư tiền và EXP
- `!daily` - Nhận phần thưởng hàng ngày
- `!bank [deposit|withdraw|balance] <số tiền>` - Ngân hàng (gửi tiết kiệm, rút tiền)
- `!gamble [taixiu|baucua] <số tiền>` - Cờ bạc (Tài xỉu, Bầu cua)
- `!rob [@tag]` - Ăn trộm tiền (có thể bị bắt vào tù)

### 👥 Group Management
- `!warn [@tag] [lý do]` - Cảnh báo thành viên (3 warn = auto kick)
- `!unwarn [@tag]` - Xóa cảnh báo
- `!antiset [anti-out|anti-change-info] [on|off]` - Bật/tắt tính năng Anti

### 🤖 AI & Fun
- `!ask <câu hỏi>` - Hỏi AI (Gemini)
- `!rank [@tag]` - Xem rank card với EXP và level
- `!help [lệnh|trang]` - Menu lệnh có phân trang

### 🔧 System Commands
- `!info` - Thông tin về bot
- `!ping` - Kiểm tra độ trễ
- `!uptime` - Thời gian bot đã chạy

### 👑 Admin Commands
- `!ban @user` - Ban người dùng
- `!kick @user` - Kick người dùng
- `!load <tên-lệnh>` - Load lệnh mới
- `!unload <tên-lệnh>` - Unload lệnh
- `!eval <code>` - Chạy code JavaScript

> Xem đầy đủ danh sách lệnh bằng `!help` hoặc `!help <số trang>`

## 🧪 Testing

```bash
# Chạy tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## 🐳 Docker Deployment

### Build image
```bash
docker build -t aurabot .
```

### Run với docker-compose
```bash
docker-compose up -d
```

### Xem logs
```bash
docker-compose logs -f
```

## 📝 Tạo lệnh mới

Tạo file mới trong `scripts/commands/<category>/<tên-lệnh>.ts`:

```typescript
import { ICommand, IRunParams } from '@types';

const command: ICommand = {
  config: {
    name: 'tên-lệnh',
    version: '1.0.0',
    author: 'Tên bạn',
    description: 'Mô tả lệnh',
    category: 'Category',
    usages: '!tên-lệnh [args]',
    role: 0 // 0: User, 1: Admin, 2: Owner
  },

  run: async (params: IRunParams) => {
    const { api, event, args, send, reply, react, Users, Threads } = params;

    // Code xử lý lệnh
    await send('Hello World!');
  }
};

export = command;
```

## 🔧 Development Scripts

```bash
# Development mode (hot reload)
npm run dev

# Production mode
npm start

# Build TypeScript
npm run build

# Run tests
npm test

# Test coverage
npm run test:coverage
```

## 📊 Database

Bot sử dụng **SQLite với WAL mode** để tối ưu hiệu năng. Database được tự động tạo khi chạy lần đầu.

### Models:
- **User**: Thông tin người dùng (money, exp, bank, jail status)
- **Thread**: Thông tin nhóm (settings, warns, previous members)

## 🛡️ Security & Best Practices

- ✅ Rate limiting để tránh spam
- ✅ Message queue để quản lý tin nhắn
- ✅ Environment variables với validation
- ✅ Global error handling
- ✅ Log rotation để quản lý logs
- ✅ Docker support cho deployment

## 📄 License

MIT License - Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## 👤 Author

**DongDev**

- GitHub: [@dongp06](https://github.com/dongp06)
- Repository: [AURABOT](https://github.com/dongp06/AURABOT)

## ⚠️ Lưu ý quan trọng

- ⚠️ Bot sử dụng Facebook Chat API không chính thức, có thể bị Facebook chặn
- 🔒 **KHÔNG** chia sẻ file `appstate.json` - đây là thông tin đăng nhập của bạn
- 🚫 Sử dụng bot một cách có trách nhiệm
- 📋 Tuân thủ Terms of Service của Facebook
- 🔑 Bảo vệ API keys và không commit lên Git

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Hãy:

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 📞 Hỗ trợ

- 🐛 **Báo lỗi**: [GitHub Issues](https://github.com/dongp06/AURABOT/issues)
- 💬 **Thảo luận**: [GitHub Discussions](https://github.com/dongp06/AURABOT/discussions)
- 📧 **Email**: (Thêm email nếu có)

## 🎯 Roadmap

- [x] Core optimization (WAL mode, Rate limiting)
- [x] Media downloaders
- [x] Economy system nâng cao
- [x] Group management features
- [x] AI integration
- [x] Docker support
- [x] Unit tests
- [ ] More media sources
- [ ] Advanced AI features
- [ ] Web dashboard

---

**Made with ❤️ by DongDev**

*Phiên bản LTS v1.0.0 - Ổn định, tối ưu và đủ tính năng để sử dụng lâu dài*
