# So sánh Payment Gateways cho Demo/Sandbox

## 🏆 Stripe (RECOMMENDED) ⭐⭐⭐⭐⭐

### ✅ Ưu điểm
- **Dễ nhất để integrate** - SDK rất tốt, docs xuất sắc
- **Không cần đăng ký phức tạp** - Chỉ cần email
- **Test cards sẵn** - Không cần thẻ thật
- **Webhook dễ test** - Stripe CLI built-in
- **UI đẹp** - Checkout page professional
- **International** - Hỗ trợ nhiều currency
- **Free sandbox** - Không giới hạn

### ❌ Nhược điểm
- Phí cao hơn VN gateways (2.9% + $0.30)
- Cần VPN để access dashboard ở VN (đôi khi)
- Không phổ biến với user VN

### 📝 Setup Steps
```bash
# 1. Install
npm install stripe

# 2. Get API keys (instant)
# Visit: https://dashboard.stripe.com/test/apikeys

# 3. Test cards
4242 4242 4242 4242 - Success
4000 0000 0000 0002 - Decline
```

### 💻 Code Example (Cực đơn giản)
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create checkout
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: { name: 'Course Name' },
      unit_amount: 5000, // $50.00
    },
    quantity: 1,
  }],
  mode: 'payment',
  success_url: 'https://yoursite.com/success',
  cancel_url: 'https://yoursite.com/cancel',
});

// Redirect to session.url
```

**Thời gian setup: 15 phút**

---

## 💙 PayPal Sandbox ⭐⭐⭐⭐

### ✅ Ưu điểm
- **Phổ biến globally** - User quen thuộc
- **Sandbox tốt** - Test accounts dễ tạo
- **Docs đầy đủ** - Nhiều examples
- **Free sandbox**
- **Hỗ trợ VN** - Có thể dùng thật sau

### ❌ Nhược điểm
- **Setup phức tạp hơn Stripe** - Cần tạo app, config nhiều
- **SDK nặng hơn** - Nhiều dependencies
- **UI cũ hơn** - Checkout page không đẹp bằng Stripe
- **Webhook phức tạp hơn**

### 📝 Setup Steps
```bash
# 1. Install
npm install @paypal/checkout-server-sdk

# 2. Create app tại PayPal Developer
# https://developer.paypal.com/dashboard/applications

# 3. Tạo sandbox accounts (buyer & seller)
# Phải tạo manual

# 4. Config client ID & secret
```

**Thời gian setup: 30-45 phút**

---

## 🇻🇳 VNPay Sandbox ⭐⭐⭐

### ✅ Ưu điểm
- **Phổ biến VN** - User tin tưởng
- **Phí thấp** - ~1.5-2%
- **Hỗ trợ VN** - Docs tiếng Việt
- **Nhiều bank VN**

### ❌ Nhược điểm
- **Đăng ký phức tạp** - Cần giấy tờ doanh nghiệp
- **Sandbox khó access** - Phải xin test account
- **Docs kém** - Thiếu examples, outdated
- **No official SDK** - Phải tự implement
- **Webhook phức tạp** - Signature verification thủ công
- **Chỉ VND** - Không support USD

### 📝 Setup Steps
```bash
# 1. Đăng ký merchant (1-2 tuần)
# Cần: GPKD, giấy tờ pháp lý

# 2. Xin sandbox credentials
# Email support, đợi approve

# 3. Implement manual
# Không có npm package chính thức
# Phải hash HMAC SHA256 thủ công
```

**Thời gian setup: 2-4 tuần (nếu có giấy tờ)**

---

## 🟣 Momo Sandbox ⭐⭐⭐

### ✅ Ưu điểm
- **Phổ biến VN** - Nhiều user dùng
- **E-wallet** - Thanh toán nhanh
- **Docs OK** - Có examples
- **Sandbox available**

### ❌ Nhược điểm
- **Đăng ký phức tạp** - Cần GPKD
- **Sandbox giới hạn** - Phải xin access
- **SDK không official** - Community packages
- **Chỉ VND**
- **Webhook phức tạp**

### 📝 Setup Steps
```bash
# 1. Đăng ký merchant
# Cần GPKD

# 2. Xin sandbox
# Qua email support

# 3. Install community package
npm install momo-payment-gateway
```

**Thời gian setup: 1-2 tuần**

---

## 📊 So sánh Tổng quan

| Feature | Stripe | PayPal | VNPay | Momo |
|---------|--------|--------|-------|------|
| **Dễ setup** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| **Docs quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **SDK quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐ | ⭐⭐ |
| **Sandbox access** | Instant | Instant | 1-2 tuần | 1-2 tuần |
| **Test cards** | Built-in | Built-in | Phải xin | Phải xin |
| **Webhook test** | Stripe CLI | OK | Manual | Manual |
| **Phí** | 2.9% + $0.30 | 3.4% + $0.30 | ~1.5% | ~2% |
| **VN support** | ❌ | ✅ | ✅ | ✅ |
| **International** | ✅ | ✅ | ❌ | ❌ |

---

## 🎯 Khuyến nghị

### Cho Demo/Đồ án (NGAY BÂY GIỜ)
**→ Dùng STRIPE** 🏆

**Lý do:**
1. Setup trong 15 phút
2. Code đơn giản nhất
3. Test dễ nhất (Stripe CLI)
4. Docs tốt nhất
5. Không cần đăng ký phức tạp
6. Professional UI

### Cho Production (SAU NÀY)
**→ Thêm VNPay hoặc Momo**

**Lý do:**
1. User VN quen thuộc
2. Phí thấp hơn
3. Hỗ trợ VND
4. Tin tưởng cao hơn

### Chiến lược Hybrid (TỐI ƯU)
```
Demo: Stripe (ngay)
  ↓
Production: Stripe + VNPay
  ↓
Scale: Stripe + VNPay + Momo
```

---

## 💡 Kết luận

**Cho đồ án của bạn:**

✅ **Dùng Stripe** vì:
- Implement trong 1-2 giờ
- Demo professional
- Dễ test, dễ debug
- Có thể dùng thật nếu cần

❌ **Không dùng VNPay/Momo** vì:
- Mất 1-2 tuần chỉ để đăng ký
- Phức tạp không cần thiết cho demo
- Có thể thêm sau khi đã có Stripe

---

## 🚀 Next Steps với Stripe

1. **Tạo Stripe account** (2 phút)
   - https://dashboard.stripe.com/register

2. **Get test API keys** (instant)
   - Test Publishable Key: `pk_test_...`
   - Test Secret Key: `sk_test_...`

3. **Install Stripe CLI** (optional, cho webhook test)
   ```bash
   # Windows
   scoop install stripe
   
   # Mac
   brew install stripe/stripe-cli/stripe
   ```

4. **Implement** (1-2 giờ)
   - Backend: Create checkout session
   - Frontend: Redirect to Stripe
   - Webhook: Handle payment success

**Bạn muốn tiếp tục với Stripe không?**
