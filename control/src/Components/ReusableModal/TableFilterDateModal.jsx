import React, { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isWithinInterval,
  isSameDay,
  addDays,
  isSameMonth,
} from "date-fns";
import ReusableModal from "./ReusableModal";

const TableFilterDateModal = ({ isOpen, onClose, onApply, title = "Filter by date" }) => {
  const today = new Date();
  const [leftMonth, setLeftMonth] = useState(today);
  const rightMonth = addMonths(leftMonth, 1);
  const [selectedRange, setSelectedRange] = useState({ start: null, end: null });
  const [selecting, setSelecting] = useState(false);

  const handleDayClick = (day) => {
    if (!day) return;
    if (!selecting) {
      setSelectedRange({ start: day, end: null });
      setSelecting(true);
    } else {
      const [s, e] =
        day < selectedRange.start
          ? [day, selectedRange.start]
          : [selectedRange.start, day];
      setSelectedRange({ start: s, end: e });
      setSelecting(false);
    }
  };

  const renderMonth = (month) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const days = eachDayOfInterval({ start, end });
    const daysOfWeek = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
    const firstDay = (start.getDay() + 6) % 7;
    const padded = Array(firstDay).fill(null).concat(days);
    const total = Math.ceil(padded.length / 7) * 7;
    const nextDays = Array(total - padded.length)
      .fill(null)
      .map((_, i) => addDays(end, i + 1));
    const all = [...padded, ...nextDays];

    return (
      <div className="tfdm-month">
        <div className="tfdm-grid">
          {daysOfWeek.map((d) => (
            <div key={d} className="tfdm-day-header">
              {d}
            </div>
          ))}
          {all.map((day, i) => {
            const isStart =
              day && selectedRange.start && isSameDay(day, selectedRange.start);
            const isEnd =
              day && selectedRange.end && isSameDay(day, selectedRange.end);
            const inRange =
              day &&
              selectedRange.start &&
              selectedRange.end &&
              isWithinInterval(day, {
                start: selectedRange.start,
                end: selectedRange.end,
              });
            const outside = day && !isSameMonth(day, month);

            return (
              <div
                key={i}
                onClick={() => handleDayClick(day)}
                className={[
                  "tfdm-day",
                  day ? "tfdm-clickable" : "tfdm-empty",
                  isStart || isEnd ? "tfdm-endpoint" : "",
                  inRange && !isStart && !isEnd ? "tfdm-in-range" : "",
                  outside ? "tfdm-outside" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {day ? format(day, "d") : ""}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleApply = () => {
    if (selectedRange.start) {
      onApply(selectedRange);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedRange({ start: null, end: null });
    setSelecting(false);
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      primaryButtonText="Apply filter"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleApply}
      onSecondaryButtonClick={handleClose}
    >
      <div className="tfdm-date-range-inputs">
        <div className="tfdm-date-input-box">
          {selectedRange.start
            ? format(selectedRange.start, "MMM d, yyyy")
            : "Start date"}
        </div>
        <span className="tfdm-range-sep">—</span>
        <div className="tfdm-date-input-box">
          {selectedRange.end
            ? format(selectedRange.end, "MMM d, yyyy")
            : "End date"}
        </div>
      </div>
      <div className="tfdm-calendars">
        <div className="tfdm-cal-col">
          <div className="tfdm-cal-nav">
            <button
              className="tfdm-nav-btn"
              onClick={() => setLeftMonth(subMonths(leftMonth, 1))}
            >
              {"<"}
            </button>
            <span className="tfdm-month-label">
              {format(leftMonth, "MMMM yyyy")}
            </span>
            <button
              className="tfdm-nav-btn"
              onClick={() => setLeftMonth(addMonths(leftMonth, 1))}
            >
              {">"}
            </button>
          </div>
          {renderMonth(leftMonth)}
        </div>
        <div className="tfdm-cal-col">
          <div className="tfdm-cal-nav">
            <span className="tfdm-month-label">
              {format(rightMonth, "MMMM yyyy")}
            </span>
          </div>
          {renderMonth(rightMonth)}
        </div>
      </div>
    </ReusableModal>
  );
};

export default TableFilterDateModal;
