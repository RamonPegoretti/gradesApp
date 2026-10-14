import { supabase } from './supabase';
import type { Grade } from './grades';

export interface Year {
  id: number;
  name: string;
  archived: boolean;
  created_at: string;
}

export interface Subject {
  id: number;
  year_id: number;
  name: string;
}

export interface StoredGrade extends Grade {
  user_id: string;
}

export interface Profile {
  id: string;
  email: string;
}

export interface HistoryEntry {
  id: number;
  at: string;
  actor_email: string | null;
  action:
    | 'grade_added'
    | 'grade_edited'
    | 'grade_deleted'
    | 'subject_added'
    | 'subject_renamed'
    | 'subject_deleted'
    | 'year_created';
  year_name: string | null;
  subject_name: string | null;
  old_value: number | null;
  new_value: number | null;
  old_weight: number | null;
  new_weight: number | null;
  old_name: string | null;
  new_name: string | null;
  detail: string | null;
}

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

const toGrade = (g: StoredGrade): StoredGrade => ({ ...g, value: Number(g.value), weight: Number(g.weight) });

export async function fetchYears(): Promise<Year[]> {
  return check(await supabase.from('years').select('*').order('created_at'));
}

export async function fetchSubjects(yearIds: number[]): Promise<Subject[]> {
  if (yearIds.length === 0) return [];
  return check(
    await supabase.from('subjects').select('id, year_id, name').in('year_id', yearIds).order('created_at'),
  );
}

export async function fetchGrades(subjectIds: number[]): Promise<StoredGrade[]> {
  if (subjectIds.length === 0) return [];
  const rows = check(
    await supabase
      .from('grades')
      .select('id, subject_id, user_id, value, weight')
      .in('subject_id', subjectIds)
      .order('id'),
  );
  return rows.map(toGrade);
}

export async function addGrade(subjectId: number, value: number, weight: number) {
  check(await supabase.from('grades').insert({ subject_id: subjectId, value, weight }));
}

export async function updateGrade(id: number, value: number, weight: number) {
  check(await supabase.from('grades').update({ value, weight }).eq('id', id));
}

export async function deleteGrade(id: number) {
  check(await supabase.from('grades').delete().eq('id', id));
}

// ---- admin

export async function createYear(name: string) {
  check(await supabase.from('years').insert({ name }));
}

export async function addSubject(yearId: number, name: string) {
  check(await supabase.from('subjects').insert({ year_id: yearId, name }));
}

export async function renameSubject(id: number, name: string) {
  check(await supabase.from('subjects').update({ name }).eq('id', id));
}

export async function deleteSubject(id: number) {
  check(await supabase.from('subjects').delete().eq('id', id));
}

export async function fetchProfiles(): Promise<Profile[]> {
  return check(await supabase.from('profiles').select('id, email').order('created_at'));
}

export async function fetchHistory(): Promise<HistoryEntry[]> {
  return check(await supabase.from('history').select('*').order('id', { ascending: false }).limit(2000));
}

export async function fetchSignupOpen(): Promise<boolean> {
  return Boolean(check(await supabase.rpc('signup_open')));
}

export async function setSignupOpen(open: boolean) {
  check(await supabase.from('settings').update({ signup_open: open }).eq('id', true));
}
