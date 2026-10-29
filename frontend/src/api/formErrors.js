function displayMessage(message, language) {
  if (language === "en") return message;
  const minimum = /must be longer than or equal to (\d+) characters/.exec(
    message,
  );
  const maximum = /must be shorter than or equal to (\d+) characters/.exec(
    message,
  );
  if (minimum) return `Cần ít nhất ${minimum[1]} ký tự.`;
  if (maximum) return `Chỉ nhập tối đa ${maximum[1]} ký tự.`;
  const length =
    /must be longer than or equal to (\d+) and shorter than or equal to (\d+) characters/.exec(
      message,
    );
  if (length) return `Cần từ ${length[1]} đến ${length[2]} ký tự.`;
  const min = /must not be less than (\d+)/.exec(message);
  const max = /must not be greater than (\d+)/.exec(message);
  if (min) return `Giá trị phải từ ${min[1]} trở lên.`;
  if (max) return `Giá trị không được vượt quá ${max[1]}.`;
  if (/must be an email/.test(message)) return "Nhập email đúng định dạng.";
  if (/must be an integer number/.test(message))
    return "Vui lòng nhập số nguyên.";
  if (/must be a UUID/.test(message))
    return "Vui lòng chọn một mục hợp lệ trong danh sách.";
  return message;
}

// Chỉ gắn lỗi vào tên ô mà biểu mẫu sở hữu, không đoán từ chuỗi lỗi chung.
export function formFieldErrors(cause, fields, options = {}) {
  const allowed = new Set(fields);
  const entries = new Map();
  const { aliases = {}, codes = {}, language = "vi" } = options;
  if (cause?.status === 400 && Array.isArray(cause.details?.fieldErrors)) {
    for (const issue of cause.details.fieldErrors.slice(0, 32)) {
      if (typeof issue?.field !== "string") continue;
      const property = issue.field.split(".")[0];
      const field = Object.hasOwn(aliases, property)
        ? aliases[property]
        : property;
      if (!allowed.has(field) || !Array.isArray(issue.messages)) continue;
      const messages = issue.messages
        .filter((message) => typeof message === "string" && message.trim())
        .slice(0, 4)
        .map((message) => displayMessage(message.slice(0, 500), language));
      if (messages.length) entries.set(field, messages.join(" "));
    }
  }
  if (
    cause?.status === 409 &&
    typeof cause.code === "string" &&
    Object.hasOwn(codes, cause.code)
  ) {
    const field = codes[cause.code];
    if (allowed.has(field) && typeof cause.message === "string")
      entries.set(field, cause.message);
  }
  return Object.fromEntries(entries);
}
