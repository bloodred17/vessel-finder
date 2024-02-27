// prevents TS errors
import {Jobs} from "./jobs.ts";
import {Command} from "./command.ts";

declare var self: Worker;

const jobs = Jobs.getInstance<Jobs>(Jobs);

self.onmessage = (event: MessageEvent) => {
  switch (event.data.command) {
    case Command.CreateJobs: {
      jobs.createJobs(event.data?.data);
      break;
    }
    case Command.Start: {
      jobs.executeJobsV2().subscribe({
        next: (value) => {
          self.postMessage(value)
        },
        complete: () => {
          self.postMessage({ command: Command.End })
        }
      });
      break;
    }
    case Command.RunJob: {
      self.postMessage({ entries: jobs.getJobs() })
      break;
    }
  }
};
