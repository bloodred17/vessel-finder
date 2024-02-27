import {VesselSchema} from "./vessel.schema.ts";
import {Injectable} from "anti-di";
import {Observable, Subscriber} from "rxjs";

export interface MongodbTask {
  taskName: string,
  data: string,
}

export class MongodbTask extends Injectable {
  private _tasks: any[][]  = [];

  get task_length() {
    return this._tasks.length;
  }

  addTask(item: any, limit = 10) {
    // if (!this._tasks?.at(-1)?.length ||
    //   (this._tasks?.at(-1)) {
    //   this._tasks?.at(-1)?.push(item);
    // } else {
    // }
    //
    // if (this._tasks?.at(-1) && thi._tasks?.at(-1)?.length < limit) {
    //   this._tasks?.at(-1)?.push([item]);
    // } else {
    //   this._tasks?.
    // }
  }

  async processTask(subscriber: Subscriber<any>) {
    const tasks_todo = this._tasks.shift();
    try {
      await VesselSchema.model.insertMany(tasks_todo);
      subscriber.next({message: 'done' + JSON.stringify(tasks_todo)})
    } catch (e) {
      console.log(e);
      subscriber.next({message: 'failed' + JSON.stringify(tasks_todo)})
    }
  }

  executeTasks() {
    return new Observable((subscriber) => {
      const interval = setInterval(async () => {
        if (this._tasks?.length == 0) {
          clearInterval(interval);
          subscriber.complete();
        } else {
          try {
            await this.processTask(subscriber);
          } catch (e) {
            subscriber.next({ message: 'failed' })
          }
        }
      })
    })
  }
}