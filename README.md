# EngLearning Backend

Backend API cho dự án EngLearning, cung cấp các dịch vụ quản lý khóa học, người dùng, và thanh toán.

## 🛠 Công nghệ sử dụng
- **Core**: Node.js, Express.js
- **Database**: PostgreSQL, Sequelize ORM
- **Auth**: JWT (JSON Web Tokens)
- **Payment**: Stripe Integration
- **Upload**: Multer

## � Hướng dẫn Cài đặt & Chạy Local

Làm theo các bước sau để chạy dự án trên máy cá nhân:

### 1. Yêu cầu hệ thống
- **Node.js**: Phiên bản 16 trở lên.
- **PostgreSQL**: Đã cài đặt và đang chạy.
- **Package Manager**: Khuyên dùng `pnpm` (hoặc `npm`).

### 2. Cài đặt dependencies
```bash
git clone https://github.com/TranDuyHai2003/EnglearningBE.git
cd EnglearningBE
pnpm install
# hoặc npm install
```

### 3. Cấu hình môi trường (.env)
Tạo file `.env` từ file mẫu:
```bash
cp .env.example .env
```
Mở file `.env` và cập nhật các thông tin sau:
- **Database**: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (Tên database bạn đã tạo trong Postgres).
- **JWT**: `JWT_SECRET` (Chuỗi bất kỳ để mã hóa token).
- **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` (Lấy từ Stripe Dashboard).
- **Frontend**: `FRONTEND_URL` (Mặc định `http://localhost:3000`).

### 4. Khởi tạo Database
Dự án sử dụng Sequelize để tự động tạo bảng. Bạn chỉ cần tạo database rỗng, sau đó chạy lệnh seed để có dữ liệu mẫu:

```bash
# Tạo dữ liệu mẫu (Users, Courses, Transactions...)
npm run seed

# Nếu muốn xóa sạch dữ liệu cũ và tạo lại từ đầu:
node scripts/seed.js --fresh
```

### 5. Chạy dự án
```bash
npm run dev
```
Server sẽ khởi động tại: `http://localhost:5000`

## 📦 Hướng dẫn Deploy

### 1. Database (PostgreSQL)
Bạn cần một database PostgreSQL online. Các dịch vụ miễn phí/giá rẻ tốt:
- **Supabase**
- **Neon**
- **Render** (Managed PostgreSQL)

### 2. Backend Server
Deploy code lên các nền tảng hỗ trợ Node.js như **Render**, **Railway**, hoặc **Heroku**.

**Cấu hình trên Server:**
- **Build Command**: `pnpm install`
- **Start Command**: `npm start`
- **Environment Variables**: Bạn **BẮT BUỘC** phải copy toàn bộ các biến trong file `.env` (bao gồm thông tin kết nối DB online và Stripe keys) vào phần cấu hình Environment Variables của server.

### 3. Lưu ý quan trọng
- **CORS**: Đảm bảo biến `FRONTEND_URL` trên server trỏ đúng về domain của trang Frontend (ví dụ: `https://englearning-fe.vercel.app`).
- **Stripe Webhook**: Cấu hình Webhook trên Stripe Dashboard trỏ về `https://<your-backend-domain>/api/payments/webhook` để nhận cập nhật trạng thái thanh toán.
