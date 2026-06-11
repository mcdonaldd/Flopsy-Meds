import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { api } from '../lib/api';

const MedsContext = createContext(null);

const initialState = { meds: [], doseLog: {}, loaded: false };

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return { meds: action.meds, doseLog: action.doseLog, loaded: true };
    case 'SET_MEDS':
      return { ...state, meds: action.meds };
    case 'ADD_MED':
      return { ...state, meds: [...state.meds, action.med] };
    case 'UPDATE_MED':
      return {
        ...state,
        meds: state.meds.map((m) => (m.id === action.id ? { ...m, ...action.changes } : m)),
      };
    case 'REMOVE_MED': {
      const doseLog = {};
      for (const [day, entries] of Object.entries(state.doseLog)) {
        const { [action.id]: _removed, ...rest } = entries;
        if (Object.keys(rest).length) doseLog[day] = rest;
      }
      return { ...state, meds: state.meds.filter((m) => m.id !== action.id), doseLog };
    }
    case 'SET_DOSE_ENTRY':
      return {
        ...state,
        doseLog: {
          ...state.doseLog,
          [action.day]: { ...state.doseLog[action.day], [action.medId]: action.entry },
        },
      };
    default:
      return state;
  }
}

export function MedsProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const noteTimers = useRef({});

  useEffect(() => {
    api('/state')
      .then(({ meds, doseLog }) => dispatch({ type: 'LOAD', meds, doseLog }))
      .catch((err) => console.error('Failed to load state:', err));
  }, []);

  const actions = useMemo(() => {
    function saveDoseEntry(day, medId, entry) {
      api('/doselog', { method: 'PUT', body: { day, medId, ...entry } }).catch((err) =>
        console.error('Failed to save dose:', err),
      );
    }

    return {
      async addMed(med) {
        const created = await api('/meds', { method: 'POST', body: med });
        dispatch({ type: 'ADD_MED', med: created });
        return created;
      },
      updateMed(id, changes) {
        dispatch({ type: 'UPDATE_MED', id, changes });
        api(`/meds/${id}`, { method: 'PUT', body: changes }).catch((err) =>
          console.error('Failed to update med:', err),
        );
      },
      setActive(id, active) {
        this.updateMed(id, { active });
      },
      removeMed(id) {
        dispatch({ type: 'REMOVE_MED', id });
        api(`/meds/${id}`, { method: 'DELETE' }).catch((err) =>
          console.error('Failed to remove med:', err),
        );
      },
      async moveMed(id, direction) {
        const meds = await api(`/meds/${id}/move`, { method: 'POST', body: { direction } });
        dispatch({ type: 'SET_MEDS', meds });
      },
      toggleDose(day, medId) {
        const prev = stateRef.current.doseLog[day]?.[medId] ?? { given: false, givenAt: null, note: '' };
        const given = !prev.given;
        const entry = { ...prev, given, givenAt: given ? new Date().toISOString() : null };
        dispatch({ type: 'SET_DOSE_ENTRY', day, medId, entry });
        saveDoseEntry(day, medId, entry);
      },
      setDoseNote(day, medId, note) {
        const prev = stateRef.current.doseLog[day]?.[medId] ?? { given: false, givenAt: null, note: '' };
        const entry = { ...prev, note };
        dispatch({ type: 'SET_DOSE_ENTRY', day, medId, entry });
        // Debounce note writes — this fires on every keystroke.
        const key = `${day}:${medId}`;
        clearTimeout(noteTimers.current[key]);
        noteTimers.current[key] = setTimeout(() => saveDoseEntry(day, medId, entry), 500);
      },
    };
  }, []);

  return <MedsContext.Provider value={{ state, actions }}>{children}</MedsContext.Provider>;
}

export function useMeds() {
  const ctx = useContext(MedsContext);
  if (!ctx) throw new Error('useMeds must be used within MedsProvider');
  return ctx;
}
