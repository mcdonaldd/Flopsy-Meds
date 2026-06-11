import { useState } from 'react';
import { useMeds } from '../state/MedsContext';
import { dateKey, addDays, formatDateKey, isToday, medActiveOn, medTimeSort, formatTime } from '../lib/dates';
import MedCard from './MedCard';

function groupByTime(meds) {
  const groups = [];
  const map = new Map();
  for (const med of meds) {
    const key = med.scheduledTime ?? '__none__';
    if (!map.has(key)) {
      map.set(key, []);
      groups.push({ time: med.scheduledTime ?? null, meds: map.get(key) });
    }
    map.get(key).push(med);
  }
  return groups;
}

export default function Tracker() {
  const { state } = useMeds();
  const [day, setDay] = useState(dateKey());

  const dueMeds = state.meds
    .filter((m) => medActiveOn(m, day))
    .sort(medTimeSort);
  const givenCount = dueMeds.filter((m) => state.doseLog[day]?.[m.id]?.given).length;

  if (!state.loaded) {
    return <p className="body-md">Loading…</p>;
  }

  return (
    <section className="stack-lg">
      <div className="day-nav">
        <button className="btn btn--secondary btn--sm" onClick={() => setDay(addDays(day, -1))}>
          <span className="btn__face">← Prev</span>
        </button>
        <div className="day-nav__label">
          <h2 className="headline-md">{isToday(day) ? 'Today' : formatDateKey(day)}</h2>
          {isToday(day) ? (
            <p className="body-sm">{formatDateKey(day)}</p>
          ) : (
            <button type="button" className="link-btn body-sm" onClick={() => setDay(dateKey())}>
              Jump to today
            </button>
          )}
        </div>
        <button className="btn btn--secondary btn--sm" onClick={() => setDay(addDays(day, 1))}>
          <span className="btn__face">Next →</span>
        </button>
      </div>

      <p className="body-md tracker-progress">
        <strong>{givenCount}</strong> of <strong>{dueMeds.length}</strong> doses given
      </p>

      {dueMeds.length === 0 ? (
        <div className="card card--paper">
          <div className="card__face">
            <p className="body-md">No medications scheduled for this day.</p>
          </div>
        </div>
      ) : (
        <div className="stack-lg">
          {groupByTime(dueMeds).map(({ time, meds }) => (
            <div key={time ?? '__none__'} className="stack-sm">
              <div className="tracker-time-header">
                <span className="tracker-time-header__label">
                  {time ? formatTime(time) : 'Unscheduled'}
                </span>
              </div>
              <div className="stack-md">
                {meds.map((med) => (
                  <MedCard key={med.id} med={med} day={day} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
