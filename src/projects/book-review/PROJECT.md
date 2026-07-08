# Book Review Channel — Project Spec

> Đọc file này trước khi AI sinh bất kỳ scene mới nào cho kênh.

## About This Video
Kênh review sách ngắn 15–20s trên TikTok/Reels/Shorts. Mỗi tập giới thiệu **1 cuốn sách**: tiêu đề, tác giả, rating, 1 câu takeaway đắt giá, 2–3 tag, CTA follow. Mục tiêu: viewer scroll qua cũng cảm được cuốn sách này nói gì trong 3s đầu.

## Target Audience
Người trẻ 20–35 tuổi ở Việt Nam, thích self-help / kinh doanh / khoa học phổ thông, ít thời gian, muốn tóm tắt nhanh trước khi mua sách.

## Visual Identity
- **Mood**: Editorial ấm áp, kiểu thư viện lúc chạng vạng. Không tech-y, không digital-y.
- **Background**: Deep navy `#0f0a1c` → deep plum `#1e162d` gradient chậm quay, grid vàng mờ, glow spots ấm.
- **Card Style**: Glassmorphism nhưng bo tròn to (radiusLg), viền vàng `#e0b872` mảnh.
- **Accents**: Gold `#e0b872` cho stars/highlights, terracotta `#c66c4e` cho gáy sách/CTA.
- **Typography**: Serif (`Georgia`) cho tên sách & quote — cảm giác in ấn cổ điển. Sans-serif Apple cho eyebrow/CTA — dễ đọc.

## Color Palette
| Role          | Name           | Hex       |
|---------------|----------------|-----------|
| Primary       | Warm Gold      | `#e0b872` |
| Secondary     | Terracotta     | `#c66c4e` |
| Positive      | Sage           | `#7fb069` |
| Warning       | Muted Coral    | `#e07a5f` |
| Negative      | Wine           | `#a63a50` |
| Highlight     | Cream Gold     | `#f2cc8f` |
| Text Primary  | Cream          | `#f5ead6` |
| Text Secondary| Parchment      | `#c9b78d` |
| Background    | Midnight Navy  | `#0f0a1c` |

## Layout Rules (9:16 shorts, 1080×1920)
- Max 1 "sản phẩm chính" (cuốn sách) trên màn hình cùng lúc.
- Book cover chiếm ~380×560px, đặt giữa vùng flex-center.
- Tag chips tối đa 3 cái, mỗi cái ≤ 12 ký tự.
- Takeaway quote ≤ 90 ký tự — nếu dài hơn, viewer không kịp đọc.
- Chừa `vh(4)` breathing room trên+dưới safe zone.

## Animation Style
- **Entrance**: `EASING.smooth` cho title/CTA, `spring({damping:12, stiffness:90})` cho cover flip.
- **Stagger**: `DURATION.stagger` (0.12s) giữa các sao và các tag.
- **Energy**: Elegant — không snap giật, book cover có wobble Math.sin nhẹ sau khi settled.

## Sound Effects (theo beat)
- Beat 1 (title): `pageTurn` — cảm giác lật trang mở đầu
- Beat 2 (cover slide in): `whoosh`
- Beat 3 (stars pop): `ding`
- Beat 4 (quote + tags): `uiSwitch`
- Beat 5 (CTA): `pageTurn` — đóng lại cuốn sách

## Constraints
- Tên sách: ≤ 25 ký tự (không thì fontSize hero bị wrap xấu).
- Tác giả: ≤ 30 ký tự.
- Rating: 0–5, cho phép nửa sao.
- Duration: 18s cố định (540 frames @ 30fps) — không thay đổi trừ khi user yêu cầu.
- KHÔNG được crawl / paste ảnh bìa thật — dùng fake cover CSS/SVG (motif emoji + màu) để tránh bản quyền.
