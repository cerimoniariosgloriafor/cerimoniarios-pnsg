import { RRule } from 'rrule';

export function expandTemplateOccurrences(template: any, rangeStart: Date, rangeEnd: Date) {
  const results: Date[] = [];
  const rec = template.recurrence;

  if (!rec) return results;

  try {
    if (rec.type === 'single') {
      const d = new Date(rec.startDate);
      if (isNaN(d.getTime())) return results;
      if (d >= rangeStart && d <= rangeEnd) results.push(d);
      return results;
    }

    const rruleOptions: any = {
      dtstart: new Date(rec.startDate),
      until: rec.endDate ? new Date(rec.endDate) : rangeEnd,
      freq: RRule.WEEKLY,
      interval: 1
    };

    if (rec.type === 'weekly') {
      rruleOptions.freq = RRule.WEEKLY;
      rruleOptions.interval = rec.weekly?.interval || 1;
      if (Array.isArray(rec.weekly?.weekdays) && rec.weekly.weekdays.length > 0) {
        const byweekday = rec.weekly.weekdays
          .map((d: number) => {
            switch (d) {
              case 1: return RRule.MO;
              case 2: return RRule.TU;
              case 3: return RRule.WE;
              case 4: return RRule.TH;
              case 5: return RRule.FR;
              case 6: return RRule.SA;
              case 7: return RRule.SU;
              default: return null;
            }
          })
          .filter(Boolean);
        if (byweekday.length) rruleOptions.byweekday = byweekday;
      }
    }

    if (rec.type === 'monthlyByWeekday') {
      rruleOptions.freq = RRule.MONTHLY;
      const mbw = rec.monthlyByWeekday || {};
      const wd = mbw.weekday;
      const wk = mbw.weekOfMonth;
      let bywd: any = null;
      switch (wd) {
        case 1: bywd = RRule.MO; break;
        case 2: bywd = RRule.TU; break;
        case 3: bywd = RRule.WE; break;
        case 4: bywd = RRule.TH; break;
        case 5: bywd = RRule.FR; break;
        case 6: bywd = RRule.SA; break;
        case 7: bywd = RRule.SU; break;
      }
      if (bywd && Number.isInteger(wk)) {
        rruleOptions.byweekday = [ bywd.nth(wk) ];
      }
    }

    if (rec.type === 'monthlyByMonthday') {
      rruleOptions.freq = RRule.MONTHLY;
      const md = rec.monthlyByMonthday || {};
      const day = md.dayOfMonth;
      if (Number.isInteger(day) && day >=1 && day <=31) {
        rruleOptions.bymonthday = [day];
      }
    }

    const rule = new RRule(rruleOptions);
    const between = rule.between(rangeStart, rangeEnd, true);

    const exceptions = (template.exceptions || []).map((d: string|Date) => new Date(d).toISOString());
    between.forEach((d: Date) => {
      if (!exceptions.includes(d.toISOString())) results.push(d);
    });
  } catch (err) {
    console.error('expandTemplateOccurrences error for template', template._id, err);
    return results;
  }

  return results;
}
