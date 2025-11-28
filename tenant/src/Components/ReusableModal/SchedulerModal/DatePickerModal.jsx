import React, { useState } from "react";
import Modal from "react-modal";
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
  subDays,
  isSameMonth,
} from "date-fns";
import "../../CalendarScheduler/Scheduler.css";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";

const DatePickerModal = ({ isOpen, onClose, onDateSelect }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(2024, 0, 1));
  const [selectedRange, setSelectedRange] = useState({
    start: new Date(2024, 0, 6),
    end: new Date(2024, 0, 13),
  });
  const [tempRange, setTempRange] = useState(null);
  const [activeQuickOption, setActiveQuickOption] = useState("lastWeek");

  const nextMonth = addMonths(currentMonth, 1);

  const renderMonth = (month) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const days = eachDayOfInterval({ start, end });
    const daysOfWeek = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
    const firstDayOfMonth = (start.getDay() + 6) % 7; // Monday start
    const paddedDays = Array(firstDayOfMonth).fill(null).concat(days);
    const totalCells = Math.ceil(paddedDays.length / 7) * 7;
    const nextMonthDays = Array(totalCells - paddedDays.length)
      .fill(null)
      .map((_, i) => addDays(end, i + 1));
    const allDays = [...paddedDays, ...nextMonthDays];

    return (
      <div className="date-picker-month">
        <div className="date-picker-month-title">{format(month, "MMMM yyyy")}</div>
        <div className="date-picker-grid">
          {daysOfWeek.map((day) => (
            <div key={day} className="date-picker-day-header">
              {day}
            </div>
          ))}
          {allDays.map((day, index) => {
            const isInRange =
              day &&
              selectedRange.start &&
              selectedRange.end &&
              isWithinInterval(day, { start: selectedRange.start, end: selectedRange.end });
            const isStart = day && selectedRange.start && isSameDay(day, selectedRange.start);
            const isEnd = day && selectedRange.end && isSameDay(day, selectedRange.end);
            const isOutsideMonth = day && !isSameMonth(day, month);

            return (
              <div
                key={index}
                onClick={() => {
                  if (!day) return;
                  if (!tempRange) {
                    setTempRange({ start: day, end: null });
                    setSelectedRange({ start: day, end: null });
                    setActiveQuickOption(null);
                  } else if (!tempRange.end) {
                    const newEnd = day;
                    const newStart = tempRange.start;
                    if (newEnd < newStart) {
                      setTempRange({ start: newEnd, end: newStart });
                      setSelectedRange({ start: newEnd, end: newStart });
                    } else {
                      setTempRange({ ...tempRange, end: newEnd });
                      setSelectedRange({ start: newStart, end: newEnd });
                    }
                  } else {
                    setTempRange({ start: day, end: null });
                    setSelectedRange({ start: day, end: null });
                    setActiveQuickOption(null);
                  }
                }}
                className={`date-picker-day ${
                  day ? "date-picker-day-clickable" : "date-picker-day-empty"
                } ${
                  isStart || isEnd
                    ? "date-picker-day-start-end"
                    : isOutsideMonth
                    ? "date-picker-day-outside"
                    : "date-picker-day-normal date-picker-day-hover"
                } ${isInRange && !isStart && !isEnd ? "date-picker-day-in-range" : ""}`}
              >
                {day ? format(day, "d") : ""}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleQuickSelect = (option) => {
    const today = new Date();
    let start, end;

    switch (option) {
      case "today":
        start = today;
        end = today;
        break;
      case "yesterday":
        start = subDays(today, 1);
        end = subDays(today, 1);
        break;
      case "thisweek":
        start = startOfMonth(today); // Adjusted to start of week (Monday)
        end = addDays(start, 6);
        break;
      case "lastweek":
        start = subDays(startOfMonth(today), 7);
        end = subDays(start, 1);
        break;
      case "thismonth":
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case "lastmonth":
        start = startOfMonth(subMonths(today, 1));
        end = endOfMonth(subMonths(today, 1));
        break;
      case "thisyear":
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;
      case "lastyear":
        start = new Date(today.getFullYear() - 1, 0, 1);
        end = new Date(today.getFullYear() - 1, 11, 31);
        break;
      case "alltime":
        start = new Date(2000, 0, 1);
        end = today;
        break;
      default:
        return;
    }

    setSelectedRange({ start, end });
    setCurrentMonth(start);
    setActiveQuickOption(option);
  };

  const handleApply = () => {
    if (selectedRange.start && selectedRange.end) {
      onDateSelect({ start: selectedRange.start, end: selectedRange.end }); // Pass both start and end
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="date-picker-modal-content"
      overlayClassName="date-picker-modal-overlay"
      appElement={document.getElementById('root')}
    >
      <div className="date-picker-container">
        {/* Sidebar */}
        <div className="date-picker-sidebar">
          {[
            "Today",
            "Yesterday",
            "This week",
            "Last week",
            "This month",
            "Last month",
            "This year",
            "Last year",
            "All time",
          ].map((option) => (
            <div
              key={option}
              onClick={() => handleQuickSelect(option.toLowerCase().replace(" ", ""))}
              className={`date-picker-quick-option ${
                activeQuickOption === option.toLowerCase().replace(" ", "")
                  ? "date-picker-quick-option-active"
                  : ""
              }`}
            >
              {option}
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div className="date-picker-calendar-container">
          <div className="date-picker-header">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 2))}
              className="date-picker-nav-button"
            >
              <IoIosArrowBack />
            </button>
            <div className="date-picker-month-labels">
              <span className="date-picker-month-label">{format(currentMonth, "MMMM yyyy")}</span>
              <span className="date-picker-month-label">{format(nextMonth, "MMMM yyyy")}</span>
            </div>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 2))}
              className="date-picker-nav-button"
            >
              <IoIosArrowForward />
            </button>
          </div>
          <div className="date-picker-calendars">
            {renderMonth(currentMonth)}
            {renderMonth(nextMonth)}
          </div>

          {/* Footer */}
          <div className="date-picker-footer">
            <div className="date-picker-range-display">
              <span className="date-picker-range-text">
                {selectedRange.start ? format(selectedRange.start, "MMM d, yyyy") : "Start Date"}
              </span>
              <span className="date-picker-range-separator">-</span>
              <span className="date-picker-range-text">
                {selectedRange.end ? format(selectedRange.end, "MMM d, yyyy") : "End Date"}
              </span>
            </div>
            <div className="date-picker-buttons">
              <button onClick={onClose} className="date-picker-button date-picker-cancel">
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="date-picker-button date-picker-apply"
                disabled={!selectedRange.end}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DatePickerModal;