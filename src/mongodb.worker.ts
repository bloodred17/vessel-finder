import {Command} from "./command.ts";
import {MongodbTask} from "./mongodb.task.ts";

declare var self: Worker;

const mongoTask = MongodbTask.getInstance<MongodbTask>(MongodbTask);
self.onmessage = (event: MessageEvent) => {
  switch (event.data?.command) {
    case Command.Start: {
      if (mongoTask.task_length > 0) {
        mongoTask.executeTasks().subscribe({
          next: (message) => postMessage(message),
          complete: () => postMessage({ command: Command.End })
        });
      }
      break;
    }
    case Command.CreateTask: {
      mongoTask.addTask(event?.data?.data);
      break;
    }
  }
}