// utils/expandForAppointments.js
import {
  parseISO,
  isValid,
  isAfter,
  isBefore,
  startOfDay,
  format,
  addDays,
  isSameDay,
  addMonths,
} from "date-fns";
import expand from "./expand";

const expandForAppointments = (master, direction = "future") => {
  const instances = [];
  
  const now = startOfDay(new Date());
  
  // Define appropriate view windows based on direction
  let viewWindow;
  
  if (direction === "future") {
    // For upcoming appointments: from today to 6 months in the future
    viewWindow = {
      start: now,
      end: addMonths(now, 6) // 6 months limit for upcoming appointments
    };
  } else if (direction === "past") {
    // For past appointments: from 6 months ago to yesterday
    viewWindow = {
      start: addMonths(now, -6), // 6 months lookback for past appointments
      end: addDays(now, -1) // Up to yesterday
    };
  } else {
    return instances;
  }

  // Use your existing expand function with the appropriate view window
  const expandedInstances = expand(master, viewWindow);
  
  // Filter based on direction and ensure we're within reasonable bounds
  return expandedInstances.filter(instance => {
    const instanceDate = parseISO(instance.date);
    if (!isValid(instanceDate)) return false;
    
    if (direction === "future") {
      return isAfter(instanceDate, now) || isSameDay(instanceDate, now);
    } else if (direction === "past") {
      return isBefore(instanceDate, now);
    }
    
    return false;
  });
};

export default expandForAppointments;