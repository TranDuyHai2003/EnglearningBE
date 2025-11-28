# Hướng dẫn Cài đặt Stripe Payment

Tài liệu này hướng dẫn chi tiết cách tạo tài khoản, lấy API Key, và cấu hình Webhook Secret cho dự án EngLearning.

## 1. Tạo tài khoản và lấy API Keys

1.  Truy cập [dashboard.stripe.com/register](https://dashboard.stripe.com/register) và tạo tài khoản (hoặc đăng nhập).
2.  Tại Dashboard, đảm bảo bạn đang ở chế độ **Test Mode** (gạt nút "Test mode" ở góc trên bên phải).
3.  Vào menu **Developers** -> **API keys**.
4.  Copy 2 giá trị sau:
    *   **Publishable key**: Bắt đầu bằng `pk_test_...`
    *   **Secret key**: Bắt đầu bằng `sk_test_...` (Nhấn "Reveal test key" để xem).

## 2. Lấy Webhook Secret (Quan trọng)

Webhook Secret (`whsec_...`) dùng để xác thực các sự kiện từ Stripe gửi về server của bạn (ví dụ: thanh toán thành công). Có 2 cách để lấy:

### Cách 1: Dùng cho Local Development (Khuyên dùng khi code)
Sử dụng Stripe CLI để nhận webhook về máy local.

1.  Tải và cài đặt [Stripe CLI](https://stripe.com/docs/stripe-cli).
2.  Mở terminal (CMD/PowerShell) và đăng nhập:
    ```bash
    stripe login
    ```
    (Làm theo hướng dẫn trên trình duyệt để xác thực).
3.  Chạy lệnh lắng nghe webhook và chuyển tiếp về server backend của bạn:
    ```bash
    stripe listen --forward-to http://localhost:5000/api/payments/webhook
    ```
    *(Lưu ý: Đảm bảo port `5000` khớp với port backend của bạn)*.
4.  Terminal sẽ hiển thị dòng chữ:
    > Ready! You are using Stripe API Version ...
    > Your webhook signing secret is **whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxx**
5.  Copy chuỗi `whsec_...` này. Đây chính là `STRIPE_WEBHOOK_SECRET`.

### Cách 2: Dùng cho Production (Triển khai thật)
1.  Vào Dashboard -> **Developers** -> **Webhooks**.
2.  Nhấn **Add endpoint**.
3.  Nhập **Endpoint URL**: `https://your-domain.com/api/payments/webhook`.
4.  Chọn **Events to send**: Chọn `checkout.session.completed`.
5.  Nhấn **Add endpoint**.
6.  Tại trang chi tiết Webhook vừa tạo, phần **Signing secret**, nhấn **Reveal** để lấy key `whsec_...`.

## 3. Cấu hình vào dự án

Mở file `.env` trong thư mục `englearning-backend` và cập nhật các biến sau:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... (Key lấy ở bước 1)
STRIPE_WEBHOOK_SECRET=whsec_... (Key lấy ở bước 2)
```

Mở file `.env` trong thư mục `englearning-frontend` (nếu cần dùng Publishable Key ở frontend):

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... (Key lấy ở bước 1)
```

## 4. Kiểm tra

1.  Khởi động lại Backend server để nhận `.env` mới.
2.  Giữ nguyên terminal chạy lệnh `stripe listen` (nếu dùng Cách 1).
3.  Vào web, thực hiện mua khóa học.
4.  Kiểm tra terminal `stripe listen`, nếu thấy:
    `200 OK POST /api/payments/webhook`
    Là đã cấu hình thành công!

## 5. Thông tin thẻ Test

Để thanh toán thử nghiệm, bạn sử dụng thông tin thẻ sau:

*   **Số thẻ**: `4242 4242 4242 4242`
*   **Ngày hết hạn**: Bất kỳ ngày nào trong tương lai (VD: `12/25`)
*   **CVC**: Bất kỳ 3 số nào (VD: `123`)
*   **Tên chủ thẻ**: Bất kỳ
*   **Zip code** (nếu có): `12345`
