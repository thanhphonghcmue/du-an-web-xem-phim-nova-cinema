# Nguồn nghiên cứu kỹ năng

Đọc trực tiếp từ ba repository theo yêu cầu của bạn; không cài plugin toàn cục và không đưa mã của chúng vào ứng dụng.

- **Taste-Skill**: [https://github.com/leonxlnx/taste-skill](https://github.com/leonxlnx/taste-skill), commit `a60a36dc2bb3bb77ccf17f2f62041f5ca8a458b9`.
- **UI/UX Pro Max**: [https://github.com/nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), commit `7246805992a42b7bba37d4cac83b01416f0c6c44`.
- **Three.js Skills**: [https://github.com/cloudai-x/threejs-skills](https://github.com/cloudai-x/threejs-skills), commit `b1c623076c661fc9b03dac19292e825a5d106823`.

## Những tài liệu đã áp dụng

- Taste-Skill: `skills/taste-skill/SKILL.md`, `skills/redesign-skill/SKILL.md`, `references/critique.md`, `references/motion.md`; dùng script `draw.mjs` và kiểm tra trình duyệt `inspect.mjs`.
- UI/UX Pro Max: `.claude/skills/ui-ux-pro-max/SKILL.md`, `references/quick-reference.md`; truy vấn thiết kế `cinema ticket booking dark`, UX `focus not obscured` và stack Next.js `client browser storage dynamic`.
- Three.js Skills: các hướng dẫn fundamentals, geometry, animation và materials; áp dụng point cloud, BufferGeometry, tài nguyên dùng chung, một draw call, giới hạn DPR và dừng vòng lặp khi tab ẩn.
- Next.js 16.4: đọc tài liệu kèm phiên bản trong `node_modules/next/dist/docs` về lazy loading/client boundary, Tailwind v3, allowedDevOrigins, agentRules và devIndicators. `AGENTS.md` được Next.js tạo tự động.

## Quyết định ưu tiên yêu cầu của bạn

Taste-Skill mặc định cấm kính mờ, gradient, glow, số bước và nhãn uppercase; redesign-skill mặc định giữ framework hiện tại. Prompt mới của bạn yêu cầu rõ Next.js App Router, kính mờ, Crimson/Amber, bước đánh số và các hiệu ứng đó. Vì vậy yêu cầu của bạn được ưu tiên, không loại bỏ chức năng chỉ để vượt qua bộ đo phong cách.

Kết quả UI/UX Pro Max đã trả về dark mode, progressive disclosure và checklist accessibility phù hợp. Palette violet/yellow và font Inter trong kết quả tự động không phù hợp brief nên không được áp dụng hoặc coi là hệ thiết kế đã xác nhận. Dùng đúng màu và font bạn chỉ định.

Inspector chạy với các ngoại lệ có chủ đích: `eyebrow`, `numbering`, `gradient`, `shadow`, `button-fx`, `hairline`, `outlined-box`, `glass`, `micro-label`, `icon-cards`, `card-rows`. Ngoại lệ icon/card dành cho nhóm lựa chọn rạp thực sự và các thẻ phim/rạp được bạn yêu cầu, không dùng chúng cho dãy tính năng marketing giả. Không miễn trừ lỗi đọc chữ, ảnh hỏng, tràn ngang, tiêu đề dài, nội dung bị che hay viewport không có CTA.

Báo cáo này là chứng cứ nghiên cứu và triển khai, không phải chứng nhận chất lượng hoặc điểm đánh giá từ các tác giả skill.
