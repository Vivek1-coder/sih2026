import type { Priority } from "./priority.type";

export type Patient = {
  name: string;
  age: number;
  gender: string;
  token: string;
  complaint: string;
  priority: Priority;
  department: string;
  wait: string;
  documents: number;
  progress: number;
};