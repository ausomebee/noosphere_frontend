

// export default expand;
import {
  parseISO,
  isValid,
  isAfter,
  isBefore,
  addDays,
  addWeeks,
  startOfWeek,
  format,
  addMonths,
  startOfMonth,
  setDate,
  getDay,
  isSameDay,
  startOfDay,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
} from "date-fns";

const expand = (master, viewWindow) => {
  const instances = [];
  const {
    date: startISO,
    startTime,
    endTime,
    recurrence: r,
    isRecurring,
    relatedAppointments = [],
    ...rest
  } = master;

  const seedDate = parseISO(startISO);
  if (!isValid(seedDate)) {
    return instances;
  }

  const normalizedRelatedAppointments = relatedAppointments
    .map((relAppt) => {
      const parsedDate = parseISO(relAppt.date);
      if (!isValid(parsedDate)) {
        return null;
      }
      return {
        ...relAppt,
        date: startOfDay(parsedDate),
      };
    })
    .filter(Boolean);

  // Handle non-recurring appointments
  if (!isRecurring || !r) {
    let instance = {
      ...rest,
      id: master.id,
      date: format(seedDate, "yyyy-MM-dd"),
      startTime,
      endTime,
      isRecurringInstance: false,
    };

    const related = normalizedRelatedAppointments.find((relAppt) =>
      isSameDay(relAppt.date, startOfDay(seedDate))
    );
    if (related) {
      instance = {
        ...rest,
        id: related.id,
        date: format(seedDate, "yyyy-MM-dd"),
        startTime: related.startTime,
        endTime: related.endTime,
        isRecurringInstance: false,
        parentId: master.id,
        client: related.client || master.client,
        tenant: related.tenant || master.tenant,
        isCanceled: related.isCanceled ?? master.isCanceled,
      };
    }

    instances.push(instance);
    return instances;
  }

  const [h, m] = startTime ? startTime.split(":").map(Number) : [0, 0];
  if (isNaN(h) || isNaN(m)) {
    return instances;
  }

  const addInstance = (candidate) => {
    if (!isValid(candidate)) {
      return false;
    }
    if (isAfter(candidate, viewWindow.end)) return false;
    if (isBefore(candidate, startOfDay(seedDate))) return false;

    const instanceDate = format(startOfDay(candidate), "yyyy-MM-dd");

    const related = normalizedRelatedAppointments.find((relAppt) =>
      isSameDay(relAppt.date, startOfDay(candidate))
    );

    let instance;
    if (related) {
      instance = {
        ...rest,
        id: related.id,
        date: instanceDate,
        startTime: related.startTime,
        endTime: related.endTime,
        isRecurringInstance: true,
        parentId: master.id,
        client: related.client || master.client,
        tenant: related.tenant || master.tenant,
        isRecurring: master.isRecurring,
        recurrence: master.recurrence,
        isCanceled: related.isCanceled ?? master.isCanceled,
      };
    } else {
      instance = {
        ...rest,
        id: `${master.id}_${candidate.getTime()}`,
        date: instanceDate,
        startTime,
        endTime,
        isRecurringInstance: true,
        parentId: master.id,
        client: master.client,
        tenant: master.tenant,
        isRecurring: master.isRecurring,
        recurrence: master.recurrence,
      };
    }

    instances.push(instance);
    return true;
  };

  const daysMap = {
    sun: 0, sunday: 0,
    mon: 1, monday: 1,
    tue: 2, tuesday: 2,
    wed: 3, wednesday: 3,
    thur: 4, thursday: 4,
    fri: 5, friday: 5,
    sat: 6, saturday: 6
  };
  const positionMap = { first: 1, second: 2, third: 3, fourth: 4, last: -1 };

  // Include related appointments that are not covered by generated instances
  const addRemainingRelatedAppointments = () => {
    normalizedRelatedAppointments.forEach((ra) => {
      const raDate = ra.date;
      if (
        isValid(raDate) &&
        !isBefore(raDate, startOfDay(seedDate)) &&
        !isAfter(raDate, viewWindow.end) &&
        !instances.some((inst) => inst.date === format(raDate, "yyyy-MM-dd"))
      ) {
        instances.push({
          ...rest,
          id: ra.id,
          date: format(raDate, "yyyy-MM-dd"),
          startTime: ra.startTime,
          endTime: ra.endTime,
          isRecurringInstance: ra.isRecurring || false,
          parentId: master.id,
          client: ra.client || master.client,
          tenant: ra.tenant || master.tenant,
          isRecurring: master.isRecurring,
          recurrence: master.recurrence,
          isCanceled: ra.isCanceled ?? master.isCanceled,
        });
      }
    });
  };

  if (r.type === "custom" && r.position && r.weekday && r.unit === "month") {
    const interval = Number(r.interval) || 1;
    const targetWeekday = daysMap[r.weekday.toLowerCase()];
    if (targetWeekday === undefined) {
      return instances;
    }
    const position = positionMap[r.position.toLowerCase()];
    if (!position) {
      return instances;
    }

    const getNthWeekday = (monthStart, nth, weekday) => {
      const monthEnd = addMonths(monthStart, 1);
      const weekdays = [];
      let current = new Date(monthStart);
      while (current < monthEnd) {
        if (getDay(current) === weekday) weekdays.push(new Date(current));
        current = addDays(current, 1);
      }
      const result = nth === -1
        ? weekdays.length ? weekdays[weekdays.length - 1] : null
        : weekdays.length >= nth ? weekdays[nth - 1] : null;
      return result;
    };

    if (r.endType === "after") {
      let created = 0;
      let monthsFromSeed = 0;
      const occurrences = Number(r.occurrences) || 0;
      
      while (created < occurrences) {
        const targetMonth = addMonths(seedDate, monthsFromSeed);
        
        if (isAfter(targetMonth, viewWindow.end)) {
          break;
        }
        
        const monthStart = startOfMonth(targetMonth);
        const candidateDate = getNthWeekday(monthStart, position, targetWeekday);
        
        if (candidateDate && isValid(candidateDate)) {
          candidateDate.setHours(h, m, 0, 0);
          
          if (!isBefore(candidateDate, startOfDay(seedDate)) && !isAfter(candidateDate, viewWindow.end)) {
            if (addInstance(candidateDate)) {
              created++;
            }
          }
        }
        
        monthsFromSeed += interval;
      }
    } else if (r.endType === "on") {
      const stop = parseISO(r.endOn);
      if (!isValid(stop)) {
        return instances;
      }
      const stopEnd = setHours(setMinutes(setSeconds(setMilliseconds(stop, 999), 59), 59), 23);
      
      let monthsFromSeed = 0;
      
      while (true) {
        const targetMonth = addMonths(seedDate, monthsFromSeed);
        
        if (isAfter(targetMonth, stopEnd)) {
          break;
        }
        
        const monthStart = startOfMonth(targetMonth);
        const candidateDate = getNthWeekday(monthStart, position, targetWeekday);
        
        if (candidateDate && isValid(candidateDate)) {
          candidateDate.setHours(h, m, 0, 0);
          
          if (!isBefore(candidateDate, startOfDay(seedDate)) && 
              !isAfter(candidateDate, stopEnd) && 
              !isAfter(candidateDate, viewWindow.end)) {
            addInstance(candidateDate);
          }
        }
        
        monthsFromSeed += interval;
      }
    } else if (r.endType === "never") {
      let monthsFromSeed = 0;
      
      while (true) {
        const targetMonth = addMonths(seedDate, monthsFromSeed);
        
        if (isAfter(targetMonth, viewWindow.end)) {
          break;
        }
        
        const monthStart = startOfMonth(targetMonth);
        const candidateDate = getNthWeekday(monthStart, position, targetWeekday);
        
        if (candidateDate && isValid(candidateDate)) {
          candidateDate.setHours(h, m, 0, 0);
          
          if (!isBefore(candidateDate, startOfDay(seedDate)) && !isAfter(candidateDate, viewWindow.end)) {
            addInstance(candidateDate);
          }
        }
        
        monthsFromSeed += interval;
      }
    }
    
    addRemainingRelatedAppointments();
    return instances;
  }

  if (r.type === "day") {
    const end =
      r.endType === "on"
        ? setHours(setMinutes(setSeconds(setMilliseconds(parseISO(r.endOn), 0), 0), 59), 23)
        : r.endType === "after"
        ? null
        : viewWindow.end;
    if (r.endType === "on" && !isValid(end)) {
      return instances;
    }
    let cand = new Date(seedDate);
    let created = 0;
    const occurrences = r.endType === "after" ? Number(r.occurrences) || Infinity : Infinity;
    while (
      (r.endType !== "on" || !isAfter(cand, end)) &&
      !isAfter(cand, viewWindow.end) &&
      created < occurrences
    ) {
      cand.setHours(h, m, 0, 0);
      if (addInstance(cand)) {
        created++;
      }
      cand = addDays(cand, 1);
    }
    addRemainingRelatedAppointments();
    return instances;
  }

  if (
    r.type === "week" ||
    (r.type === "custom" && r.unit === "week" && Array.isArray(r.days))
  ) {
    const targetDays = Array.isArray(r.days)
      ? r.days
          .map((d) => {
            const dayKey = typeof d === "string" ? d.toLowerCase() : null;
            if (!daysMap.hasOwnProperty(dayKey)) {
              return null;
            }
            return daysMap[dayKey];
          })
          .filter((d) => d !== null)
      : [];
    if (!targetDays.length) {
      return instances;
    }

    const interval = r.type === "custom" ? Number(r.interval) || 1 : 1;
    let weekCursor = startOfWeek(seedDate, { weekStartsOn: 0 });

    if (r.endType === "after") {
      const occurrences = Number(r.occurrences) || 0;
      for (const dow of targetDays) {
        let created = 0;
        let weekOffset = 0;
        while (created < occurrences && !isAfter(addWeeks(weekCursor, weekOffset * interval), viewWindow.end)) {
          const cand = addDays(addWeeks(weekCursor, weekOffset * interval), dow);
          if (!isBefore(cand, startOfDay(seedDate)) && !isAfter(cand, viewWindow.end)) {
            const inst = new Date(cand);
            if (!isValid(inst)) {
              weekOffset++;
              continue;
            }
            inst.setHours(h, m, 0, 0);
            if (addInstance(inst)) {
              created++;
            }
          }
          weekOffset++;
        }
      }
    } else if (r.endType === "on") {
      const stop = setHours(setMinutes(setSeconds(setMilliseconds(parseISO(r.endOn), 0), 0), 59), 23);
      if (!isValid(stop)) {
        return instances;
      }
      let w = 0;
      while (!isAfter(addWeeks(weekCursor, w * interval), stop)) {
        const currentWeekStart = addWeeks(weekCursor, w * interval);
        for (const dow of targetDays) {
          const cand = addDays(currentWeekStart, dow);
          if (!isBefore(cand, startOfDay(seedDate)) && !isAfter(cand, stop)) {
            const inst = new Date(cand);
            if (!isValid(inst)) {
              continue;
            }
            inst.setHours(h, m, 0, 0);
            addInstance(inst);
          }
        }
        w++;
      }
    } else if (r.endType === "never") {
      let w = 0;
      while (!isAfter(addWeeks(weekCursor, w * interval), viewWindow.end)) {
        const currentWeekStart = addWeeks(weekCursor, w * interval);
        for (const dow of targetDays) {
          const cand = addDays(currentWeekStart, dow);
          if (!isBefore(cand, startOfDay(seedDate)) && !isAfter(cand, viewWindow.end)) {
            const inst = new Date(cand);
            if (!isValid(inst)) {
              continue;
            }
            inst.setHours(h, m, 0, 0);
            addInstance(inst);
          }
        }
        w++;
      }
    }
    
    addRemainingRelatedAppointments();
    return instances;
  }

  if (r.type === "month" || (r.type === "custom" && r.unit === "month" && Array.isArray(r.day))) {
    if (!Array.isArray(r.day) || !r.day.length) {
      return instances;
    }
    const interval = r.type === "custom" ? Number(r.interval) || 1 : 1;
    if (r.endType === "after") {
      let count = 0;
      let monthOffset = 0;
      const occurrences = Number(r.occurrences) || 0;
      while (count < occurrences) {
        for (const day of r.day) {
          const inst = addMonths(seedDate, monthOffset * interval);
          inst.setDate(day);
          if (!isValid(inst)) continue;
          inst.setHours(h, m, 0, 0);
          if (!isBefore(inst, startOfDay(seedDate)) && !isAfter(inst, viewWindow.end)) {
            if (addInstance(inst)) count++;
          }
        }
        monthOffset++;
      }
    } else if (r.endType === "on") {
      const stop = setHours(setMinutes(setSeconds(setMilliseconds(parseISO(r.endOn), 0), 0), 59), 23);
      if (!isValid(stop)) {
        return instances;
      }
      let monthOffset = 0;
      while (!isAfter(addMonths(seedDate, monthOffset * interval), stop)) {
        for (const day of r.day) {
          const inst = addMonths(seedDate, monthOffset * interval);
          inst.setDate(day);
          if (!isValid(inst)) continue;
          inst.setHours(h, m, 0, 0);
          if (!isBefore(inst, startOfDay(seedDate)) && !isAfter(inst, stop)) {
            addInstance(inst);
          }
        }
        monthOffset++;
      }
    } else if (r.endType === "never") {
      let monthOffset = 0;
      while (!isAfter(addMonths(seedDate, monthOffset * interval), viewWindow.end)) {
        for (const day of r.day) {
          const inst = addMonths(seedDate, monthOffset * interval);
          inst.setDate(day);
          if (!isValid(inst)) continue;
          inst.setHours(h, m, 0, 0);
          if (!isBefore(inst, startOfDay(seedDate)) && !isAfter(inst, viewWindow.end)) {
            addInstance(inst);
          }
        }
        monthOffset++;
      }
    }
    
    addRemainingRelatedAppointments();
    return instances;
  }

  return instances;
};

export default expand;