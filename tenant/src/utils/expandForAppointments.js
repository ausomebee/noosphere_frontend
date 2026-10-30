// src/utils/expandForAppointments.js
import {
  parseISO,
  isValid,
  isAfter,
  isBefore,
  startOfDay,
  addMonths,
  addDays,
  isSameDay,
} from "date-fns";
import expand from "./expand";

const expandForAppointments = (master, direction = "future") => {
  const instances = [];
  
  const now = startOfDay(new Date());
  
  let viewWindow;
  
  if (direction === "future") {
    viewWindow = {
      start: now,
      end: addMonths(now, 6)
    };
  } else if (direction === "past") {
    viewWindow = {
      start: addMonths(now, -6),
      end: addDays(now, -1)
    };
  } else {
    return instances;
  }

  // This gives us all the instances with correct date, id, etc.
  const expandedInstances = expand(master, viewWindow);
  
  // THIS IS THE ONLY LINE YOU WERE MISSING:
  return expandedInstances.map(instance => ({
    ...master,      // ← THIS brings back the .service array you added in toTableRow!
    ...instance     // ← then overrides date, id, etc.
  })).filter(instance => {
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