import {Job} from "./jobs.ts";

export enum Command {
  Start = 'start',
  End = 'end',
  CreateJobs = 'create_jobs',
  RunJob = 'run_job',
  CreateTask = 'create_task',
}

export interface WorkerMessage {
  command: Command,
  data: Job[] | any
}