import { useState, useOptimistic, startTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { useI18n } from "@/i18n.js";
const normalize = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d");
export default function QuickChoice({
  label,
  title,
  value,
  items,
  onChange,
  placeholder = "Chọn…",
  disabled = false,
  searchable = true,
}) {
  const { language, t } = useI18n();
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  const [optimisticValue, selectOptimistically] = useOptimistic(value);
  const selected = items.find((item) => item.id === optimisticValue);
  const visible = items.filter((item) =>
    normalize(`${item.name} ${item.description || ""}`).includes(
      normalize(query),
    ),
  );
  function keyboard(event) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const options = [
      ...event.currentTarget.querySelectorAll('[role="option"]:not(:disabled)'),
    ];
    const index = options.indexOf(document.activeElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? options.length - 1
          : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) %
            options.length;
    options[next]?.focus();
    event.preventDefault();
  }
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          role="combobox"
          aria-label={t(label)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={`choice-trigger ${selected ? "has-selection" : ""}`}
          data-value={selected?.id || ""}
          disabled={disabled}
        >
          <span>{selected?.name || t(placeholder)}</span>
          <ChevronDown size={18} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="nova-choice-overlay" />
        <Dialog.Content
          className="nova-choice-dialog"
          aria-describedby={undefined}
        >
          <div className="choice-heading">
            <div>
              <p className="nova-kicker">{t("HẸN NHAU Ở NOVA")}</p>
              <Dialog.Title>{t(title || label)}</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="icon-button"
                aria-label={t("Đóng lựa chọn")}
              >
                <X size={23} />
              </button>
            </Dialog.Close>
          </div>
          {searchable && (
            <label className="choice-search">
              <Search size={20} />
              <input
                aria-label={`${language === "en" ? "Search" : "Tìm trong"} ${t(label).toLowerCase()}`}
                placeholder={t("Nhập tên hoặc địa điểm…")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          )}
          <div
            className="choice-options"
            role="listbox"
            aria-label={t(label)}
            onKeyDown={keyboard}
          >
            {visible.map((item) => (
              <button
                type="button"
                role="option"
                aria-selected={item.id === optimisticValue}
                data-value={item.id}
                disabled={item.disabled}
                key={item.id}
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                  startTransition(() => {
                    selectOptimistically(item.id);
                    onChange(item.id);
                  });
                }}
              >
                {item.image && <img src={item.image} alt="" loading="lazy" />}
                <div>
                  <strong>{item.name}</strong>
                  {item.description && <span>{item.description}</span>}
                  {item.detail && <small>{item.detail}</small>}
                </div>
                {item.id === optimisticValue ? (
                  <Check size={21} />
                ) : (
                  <span className="choice-circle" />
                )}
              </button>
            ))}
          </div>
          {!visible.length && (
            <p className="choice-empty">
              {t("Chưa có lựa chọn phù hợp. Thử tên khác hoặc xóa từ khóa.")}
            </p>
          )}
          <p className="choice-footnote">
            {visible.length} {t("lựa chọn · Thông tin theo lịch đang mở bán")}
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
