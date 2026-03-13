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
import "./CustomTable.css";
import Button from "../Button/Button";

const DateFilterDropdown = ({ isOpen, onClose, onDateRangeSelect, onDateChange }) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today);
  const [selectedRange, setSelectedRange] = useState({ start: null, end: null });
  const [tempRange, setTempRange] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);

  // Compute the effective end for hover preview
  const previewEnd =
    tempRange && !tempRange.end && hoverDate ? hoverDate : selectedRange.end;
  const previewStart = selectedRange.start;
  const previewRange =
    previewStart && previewEnd
      ? previewStart <= previewEnd
        ? { start: previewStart, end: previewEnd }
        : { start: previewEnd, end: previewStart }
      : null;

  const updateRange = (newRange) => {
    setSelectedRange(newRange);
    onDateChange?.(newRange);
  };

  const renderMonth = (month) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const days = eachDayOfInterval({ start, end });
    const daysOfWeek = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
    const firstDayOfMonth = (start.getDay() + 6) % 7;
    const paddedDays = Array(firstDayOfMonth).fill(null).concat(days);
    const totalCells = Math.ceil(paddedDays.length / 7) * 7;
    const nextMonthDays = Array(totalCells - paddedDays.length)
      .fill(null)
      .map((_, i) => addDays(end, i + 1));
    const allDays = [...paddedDays, ...nextMonthDays];

    return (
      <div className="date-filter-month">
        <div className="date-filter-grid">
          {daysOfWeek.map((day) => (
            <div key={day} className="date-filter-day-header">
              {day}
            </div>
          ))}
          {allDays.map((day, index) => {
            const isStart = day && selectedRange.start && isSameDay(day, selectedRange.start);
            const isEnd =
              day &&
              selectedRange.end &&
              !isSameDay(selectedRange.start, selectedRange.end) &&
              isSameDay(day, selectedRange.end);
            const isSingle =
              day &&
              selectedRange.start &&
              selectedRange.end &&
              isSameDay(selectedRange.start, selectedRange.end) &&
              isSameDay(day, selectedRange.start);
            const isInRange =
              day &&
              previewRange &&
              !isSameDay(day, previewRange.start) &&
              !isSameDay(day, previewRange.end) &&
              isWithinInterval(day, { start: previewRange.start, end: previewRange.end });
            const isPreviewEnd =
              day && previewRange && !isEnd && isSameDay(day, previewRange.end);
            const isOutsideMonth = day && !isSameMonth(day, month);

            return (
              <div
                key={index}
                onClick={() => {
                  if (!day) return;
                  if (!tempRange) {
                    const newRange = { start: day, end: day };
                    setTempRange({ start: day, end: null });
                    updateRange(newRange);
                  } else if (!tempRange.end) {
                    const a = tempRange.start;
                    const b = day;
                    const newRange =
                      b < a ? { start: b, end: a } : { start: a, end: b };
                    setTempRange(newRange);
                    updateRange(newRange);
                  } else {
                    const newRange = { start: day, end: day };
                    setTempRange({ start: day, end: null });
                    updateRange(newRange);
                  }
                }}
                onMouseEnter={() => {
                  if (tempRange && !tempRange.end) setHoverDate(day);
                }}
                onMouseLeave={() => setHoverDate(null)}
                className={[
                  "date-filter-day",
                  day ? "date-filter-day-clickable" : "date-filter-day-empty",
                  isSingle
                    ? "date-filter-day-single"
                    : isStart
                    ? "date-filter-day-start"
                    : isEnd || isPreviewEnd
                    ? "date-filter-day-end"
                    : isInRange
                    ? "date-filter-day-in-range"
                    : isOutsideMonth
                    ? "date-filter-day-outside"
                    : "date-filter-day-normal date-filter-day-hover",
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
      onDateRangeSelect(selectedRange);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="date-filter-dropdown no-scrollbar::-webkit-scrollbar no-scrollbar">
      <div className="date-filter-header">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="date-filter-nav-button"
        >
          {"<"}
        </button>
        <span className="date-filter-month-label">
          {format(currentMonth, "MMMM yyyy")}
        </span>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="date-filter-nav-button"
        >
          {">"}
        </button>
      </div>

      {renderMonth(currentMonth)}

      <div className="date-filter-footer">
        <Button onClick={onClose} variant="secondary" label="Cancel" className="date-filter-button" />
        <Button
          onClick={handleApply}
          className="date-filter-button date-filter-apply"
          label="Apply"
          variant="primary"
          disabled={!selectedRange.start}
        />
      </div>
    </div>
  );
};

export default DateFilterDropdown;
