import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { DayPicker, DayButton } from "react-day-picker";
import { vi, enGB } from "react-day-picker/locale";
import { useI18n } from "../i18n.js";
import { CalendarDays, X } from "lucide-react";
import {
  calendarDate,
  calendarKey,
  friendlyDay,
  vietnamDay,
} from "../bookingDates.js";
function BookingDay(props) {
  return (
    <DayButton {...props} data-calendar-date={calendarKey(props.day.date)} />
  );
}
export default function DateSelector({
  dates,
  value,
  onChange,
  label = "Chọn ngày chiếu",
  disabled = false,
}) {
  const { language, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [today] = useState(() => vietnamDay(Date.now()));
  const available = new Set(dates.map((date) => date.id));
  const first = dates[0]?.id,
    last = dates.at(-1)?.id;
  const selected = available.has(value) ? value : "";
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="choice-trigger date-choice-trigger"
          aria-label={t(label)}
          data-value={selected}
          data-min={first}
          data-max={last}
          disabled={disabled || !dates.length}
        >
          <span>
            {selected
              ? friendlyDay(selected, language)
              : t("Chọn ngày bạn muốn đi")}
          </span>
          <CalendarDays size={19} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="nova-choice-overlay" />
        <Dialog.Content
          className="nova-choice-dialog nova-calendar-dialog"
          aria-describedby="calendar-description"
        >
          <div className="choice-heading">
            <div>
              <p className="nova-kicker">{t("CHỌN NGÀY HẸN")}</p>
              <Dialog.Title>{t("Lịch chiếu của bạn")}</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="icon-button"
                aria-label={t("Đóng lịch")}
              >
                <X size={22} />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description id="calendar-description">
            {t(
              "Chọn ngày có lịch đang mở bán. Tất cả giờ chiếu tính theo giờ Việt Nam.",
            )}
          </Dialog.Description>
          {first && (
            <DayPicker
              mode="single"
              required
              locale={language === "en" ? enGB : vi}
              weekStartsOn={1}
              today={calendarDate(today)}
              selected={selected ? calendarDate(selected) : undefined}
              defaultMonth={calendarDate(selected || first)}
              startMonth={calendarDate(first)}
              endMonth={calendarDate(last)}
              disabled={(date) => !available.has(calendarKey(date))}
              modifiers={{
                available: (date) => available.has(calendarKey(date)),
              }}
              modifiersClassNames={{ available: "calendar-available" }}
              onSelect={(date) => {
                if (date) {
                  onChange(calendarKey(date));
                  setOpen(false);
                }
              }}
              showOutsideDays
              fixedWeeks
              components={{ DayButton: BookingDay }}
              labels={{
                labelNext: () => t("Tháng sau"),
                labelPrevious: () => t("Tháng trước"),
              }}
            />
          )}
          <div className="calendar-key">
            <span>
              <i /> {t("Có lịch mở bán")}
            </span>
            <span>{t("Ngày mờ: chưa có suất phù hợp")}</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
