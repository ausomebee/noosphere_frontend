// src/Components/DateFilter/DateFilterDropdown.jsx
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
  isSameMonth,
  addDays,
  isValid,
  parse,
} from "date-fns";
import Button from "../Button/Button";

const DateFilterDropdown = ({ isOpen, onClose, onDateRangeSelect }) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today);
  const [selectedRange, setSelectedRange] = useState({ start: null, end: null });
  const [tempStart, setTempStart] = useState(null);

  const renderMonth = (month) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const days = eachDayOfInterval({ start, end });
    const daysOfWeek = ["Mo", "Tu", "We", "Th", "Fr", "Sat", "Su"];
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

          {allDays.map((day, idx) => {
            const isInRange =
              day &&
              selectedRange.start &&
              selectedRange.end &&
              isWithinInterval(day, {
                start: selectedRange.start,
                end: selectedRange.end,
              });

            const isStart = day && selectedRange.start && isSameDay(day, selectedRange.start);
            const isEnd = day && selectedRange.end && isSameDay(day, selectedRange.end);
            const isOutside = day && !isSameMonth(day, month);

            return (
              <div
                key={idx}
                onClick={() => {
                  if (!day) return;

                  if (!tempStart) {
                    setTempStart(day);
                    setSelectedRange({ start: day, end: day });
                  } else {
                    const newStart = tempStart;
                    const newEnd = day;
                    setSelectedRange({
                      start: newStart < newEnd ? newStart : newEnd,
                      end: newStart < newEnd ? newEnd : newStart,
                    });
                    setTempStart(null);
                  }
                }}
                className={`date-filter-day ${
                  day ? "date-filter-day-clickable" : "date-filter-day-empty"
                } ${
                  isStart || isEnd
                    ? "date-filter-day-start-end"
                    : isOutside
                    ? "date-filter-day-outside"
                    : "date-filter-day-hover"
                } ${
                  isInRange && !isStart && !isEnd
                    ? "date-filter-day-in-range"
                    : ""
                }`}
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
    if (selectedRange.start && selectedRange.end) {
      onDateRangeSelect({
        start: selectedRange.start,
        end: selectedRange.end,
      });
      onClose();
    }
  };

  const handleClear = () => {
    setSelectedRange({ start: null, end: null });
    setTempStart(null);
    onDateRangeSelect(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="date-filter-dropdown no-scrollbar">
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
        <Button onClick={handleClear} variant="secondary" label="Clear" className="flex-1" />
        <Button onClick={handleApply} variant="primary" label="Apply" className="flex-1" />
      </div>
    </div>
  );
};

export default DateFilterDropdown;