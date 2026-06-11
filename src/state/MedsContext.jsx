import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { seedNewUser } from '../data/seedMeds';

const MedsContext = createContext(null);

const initialState = { meds: [], doseLog: {}, loaded: false };

function rowToMed(row) {
  return {
    id: row.id,
    name: row.name,
    dose: row.dose,
    timing: row.timing,
    instructions: row.instructions,
    shortTerm: row.short_term,
    endDate: row.end_date,
    color: row.color,
    active: row.active,
    sortOrder: row.sort_order,
  };
}

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
    case 'SWAP_SORT_ORDER':
      return {
        ...state,
        meds: state.meds.map((m) => {
          if (m.id === action.id) return { ...m, sortOrder: action.newOrder };
          if (m.id === action.neighborId) return { ...m, sortOrder: action.neighborNewOrder };
          return m;
        }),
      };
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
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const userRef = useRef(user);
  userRef.current = user;
  const noteTimers = useRef({});

  useEffect(() => {
    async function load() {
      let { data: medRows } = await supabase.from('meds').select('*').order('sort_order');
      let meds = (medRows ?? []).map(rowToMed);

      if (meds.length === 0) {
        await seedNewUser(user.id);
        const { data: seeded } = await supabase.from('meds').select('*').order('sort_order');
        meds = (seeded ?? []).map(rowToMed);
      }

      const { data: logRows } = await supabase.from('dose_log').select('*');
      const doseLog = {};
      for (const row of logRows ?? []) {
        doseLog[row.day] ??= {};
        doseLog[row.day][row.med_id] = { given: row.given, givenAt: row.given_at, note: row.note };
      }
      dispatch({ type: 'LOAD', meds, doseLog });
    }
    load().catch((err) => console.error('Failed to load state:', err));
  }, [user.id]);

  const actions = useMemo(() => {
    function upsertDose(day, medId, entry) {
      supabase
        .from('dose_log')
        .upsert({
          user_id: userRef.current.id,
          day,
          med_id: medId,
          given: entry.given,
          given_at: entry.givenAt ?? null,
          note: entry.note ?? '',
        })
        .then(({ error }) => {
          if (error) console.error('Failed to save dose:', error);
        });
    }

    return {
      async addMed(med) {
        const maxOrder = stateRef.current.meds.reduce((m, x) => Math.max(m, x.sortOrder), 0);
        const { data, error } = await supabase
          .from('meds')
          .insert({
            user_id: userRef.current.id,
            name: med.name ?? '',
            dose: med.dose ?? '',
            timing: med.timing ?? '',
            instructions: med.instructions ?? '',
            short_term: med.shortTerm ?? false,
            end_date: med.endDate ?? null,
            color: med.color ?? 'coral',
            active: true,
            sort_order: maxOrder + 1,
          })
          .select()
          .single();
        if (error) throw new Error(error.message);
        const created = rowToMed(data);
        dispatch({ type: 'ADD_MED', med: created });
        return created;
      },

      updateMed(id, changes) {
        dispatch({ type: 'UPDATE_MED', id, changes });
        const row = {};
        if ('name' in changes) row.name = changes.name;
        if ('dose' in changes) row.dose = changes.dose;
        if ('timing' in changes) row.timing = changes.timing;
        if ('instructions' in changes) row.instructions = changes.instructions;
        if ('shortTerm' in changes) row.short_term = changes.shortTerm;
        if ('endDate' in changes) row.end_date = changes.endDate;
        if ('color' in changes) row.color = changes.color;
        if ('active' in changes) row.active = changes.active;
        supabase
          .from('meds')
          .update(row)
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('Failed to update med:', error);
          });
      },

      setActive(id, active) {
        this.updateMed(id, { active });
      },

      removeMed(id) {
        dispatch({ type: 'REMOVE_MED', id });
        // dose_log rows cascade-delete via FK; just delete the med
        supabase
          .from('meds')
          .delete()
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('Failed to remove med:', error);
          });
      },

      async moveMed(id, direction) {
        const sorted = [...stateRef.current.meds].sort((a, b) => a.sortOrder - b.sortOrder);
        const idx = sorted.findIndex((m) => m.id === id);
        const neighborIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (neighborIdx < 0 || neighborIdx >= sorted.length) return;
        const neighbor = sorted[neighborIdx];

        const aOrder = sorted[idx].sortOrder;
        const bOrder = neighbor.sortOrder;

        dispatch({
          type: 'SWAP_SORT_ORDER',
          id,
          neighborId: neighbor.id,
          newOrder: bOrder,
          neighborNewOrder: aOrder,
        });

        await supabase.from('meds').update({ sort_order: bOrder }).eq('id', id);
        await supabase.from('meds').update({ sort_order: aOrder }).eq('id', neighbor.id);
      },

      toggleDose(day, medId) {
        const prev = stateRef.current.doseLog[day]?.[medId] ?? { given: false, givenAt: null, note: '' };
        const given = !prev.given;
        const entry = { ...prev, given, givenAt: given ? new Date().toISOString() : null };
        dispatch({ type: 'SET_DOSE_ENTRY', day, medId, entry });
        upsertDose(day, medId, entry);
      },

      setDoseNote(day, medId, note) {
        const prev = stateRef.current.doseLog[day]?.[medId] ?? { given: false, givenAt: null, note: '' };
        const entry = { ...prev, note };
        dispatch({ type: 'SET_DOSE_ENTRY', day, medId, entry });
        const key = `${day}:${medId}`;
        clearTimeout(noteTimers.current[key]);
        noteTimers.current[key] = setTimeout(() => upsertDose(day, medId, entry), 500);
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
