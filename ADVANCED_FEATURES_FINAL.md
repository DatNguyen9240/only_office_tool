# Meridian DMS — Danh sách chức năng nâng cao

## Quản lý tài liệu

- Upload trực tiếp S3/MinIO bằng presigned URL, progress, retry và hủy upload.
- Upload session và trạng thái xử lý file.
- Versioning, lịch sử, so sánh và khôi phục version.
- Chỉnh sửa Office trên web với ONLYOFFICE.
- Preview/thumbnail/metadata tài liệu.
- Trộn dữ liệu vào biểu mẫu Word (Word merging) thông qua OpenXML mà không thay đổi cấu trúc định dạng.
- Tự động xuất báo cáo Excel chứa biểu đồ động, công thức toán và định dạng phức tạp (sử dụng EPPlus).
- Tự viết dịch vụ chuyển đổi định dạng tài liệu (Word/Excel sang PDF) sử dụng LibreOffice chạy headless trong Docker container của dịch vụ.
- Trash, retention và xóa vĩnh viễn.

## Chia sẻ và cộng tác

- Phân quyền theo user, nhóm, folder và file.
- Link chia sẻ có hạn dùng, mật khẩu và thu hồi.
- Comment, mention, notification và activity timeline.
- Lock file, cảnh báo xung đột, hiển thị người đang chỉnh sửa.
- Watermark theo người xem/quyền truy cập.

## Tìm kiếm và tổ chức

- Folder tree, favorites, recent files và saved searches.
- Tags, custom metadata và document templates.
- Tìm theo tên, nội dung, metadata, tag, owner, thời gian và trạng thái.
- OCR tài liệu scan.
- Elasticsearch/Elastic Cloud cho metadata, full-text, autocomplete, highlight, filter/facet và hybrid/semantic search phục vụ RAG.
- Elastic Cloud chỉ dùng thử miễn phí; Elasticsearch tự quản lý có Basic miễn phí lâu dài.
- PostgreSQL là nguồn dữ liệu chuẩn cho document, version và quyền; Elasticsearch chỉ là search index có thể tạo lại.

## Bảo mật và tuân thủ

- Quét malware và xác minh loại file thực tế.
- Audit log cho mọi thao tác quan trọng.
- Đăng nhập bằng password và passkey (WebAuthn); hỗ trợ passkey làm phương thức đăng nhập chính hoặc xác thực tăng cường.
- Session management: xem thiết bị đăng nhập, thu hồi từng phiên/toàn bộ phiên, access-token expiry và refresh-token rotation.

## Workflow và tự động hóa

- Email, in-app notification và webhook.
- Dọn upload dang dở, file/version hết retention và preview tạm.

## AI và RAG

- Phân loại tài liệu và đề xuất folder/workflow.
- Tự gắn tag, metadata và trích xuất dữ liệu.
- Tóm tắt tài liệu và so sánh versions.
- RAG hỏi đáp theo tài liệu có quyền truy cập, kèm nguồn trích dẫn.
- Cảnh báo thông tin nhạy cảm.

## Nên chạy bằng queue

- Quét virus, OCR, preview/thumbnail, chuyển đổi định dạng.
- Lập chỉ mục full-text/vector, embeddings và RAG ingestion.
- Notification, workflow deadline, webhook.
- Watermark, redaction, backup/archive, cleanup và các tác vụ AI.
