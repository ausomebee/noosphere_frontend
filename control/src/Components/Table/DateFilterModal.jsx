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

const DateFilterDropdown = ({ isOpen, onClose, onDateRangeSelect }) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today);
  const [selectedRange, setSelectedRange] = useState({
    start: null,
    end: null,
  });
  const [tempRange, setTempRange] = useState(null);

  const renderMonth = (month) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const days = eachDayOfInterval({ start, end });
    const daysOfWeek = ["Mo", "Tu", "We", "Th", "Fr", "Sat", "Su"];
    const firstDayOfMonth = (start.getDay() + 6) % 7; // Adjust for Monday start (0 = Monday, 6 = Sunday)
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
            const isInRange =
              day &&
              selectedRange.start &&
              selectedRange.end &&
              isWithinInterval(day, {
                start: selectedRange.start,
                end: selectedRange.end,
              });
            const isStart =
              day && selectedRange.start && isSameDay(day, selectedRange.start);
            const isEnd =
              day && selectedRange.end && isSameDay(day, selectedRange.end);
            const isOutsideMonth = day && !isSameMonth(day, month);

            return (
              <div
                key={index}
                onClick={() => {
                  if (!day) return;
                  if (!tempRange) {
                    // Start a new selection (single date)
                    setTempRange({ start: day, end: null });
                    setSelectedRange({ start: day, end: day }); // Set as single date initially
                  } else if (!tempRange.end) {
                    // Complete the range selection
                    const newEnd = day;
                    const newStart = tempRange.start;
                    if (newEnd < newStart) {
                      setTempRange({ start: newEnd, end: newStart });
                      setSelectedRange({ start: newEnd, end: newStart });
                    } else {
                      setTempRange({ start: newStart, end: newEnd });
                      setSelectedRange({ start: newStart, end: newEnd });
                    }
                  } else {
                    // Start a new selection (single date)
                    setTempRange({ start: day, end: null });
                    setSelectedRange({ start: day, end: day });
                  }
                }}
                className={`date-filter-day ${
                  day ? "date-filter-day-clickable" : "date-filter-day-empty"
                } ${
                  isStart || isEnd
                    ? "date-filter-day-start-end"
                    : isOutsideMonth
                    ? "date-filter-day-outside"
                    : "date-filter-day-normal date-filter-day-hover"
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
        <Button
          onClick={onClose}
          variant="secondary"
          label={"Cancel"}
          className="date-filter-button"
        />
        <Button
          onClick={handleApply}
          className="date-filter-button date-filter-apply"
          label="Apply"
          variant="primary"
        />
        
        
      </div>
    </div>
  );
};

export default DateFilterDropdown;
