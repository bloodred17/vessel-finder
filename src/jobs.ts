import {Injectable} from "anti-di";
import {Observable, take} from "rxjs";
import puppeteer, {Browser} from "puppeteer";
import {VesselFinderScraper} from "./vessel-finder.scraper.ts";
import MessageEvent = Bun.MessageEvent;
import {Command} from "./command.ts";
import {fromArrayLike} from "rxjs/internal/observable/innerFrom";
import {VesselSchema} from "./vessel.schema.ts";

export interface NewJob {
  name: string,
  url: string,
}

type Job = (NewJob & {status: Status})

export enum Status {
  Queued = 'queued',
  Processing = 'processing',
  Done = 'done',
  Failed = 'failed'
}


export class Jobs extends Injectable {
  private jobList: Job[] = [];
  private failedJobs: Job[] = [];
  private _browser!: Browser
  private vesselFinder = VesselFinderScraper.getInstance<VesselFinderScraper>(VesselFinderScraper);
  readonly mongodbWorker: Worker;

  private activeQueue: Job[] = [];

  constructor() {
    super();

    puppeteer.launch({
      headless: false,
      args: ['--start-maximized'],
      defaultViewport: null,
    }).then((browser) => this._browser = browser);

    const mongodbWorkerURL = new URL("mongodb.worker.ts", import.meta.url).href;
    this.mongodbWorker = new Worker(mongodbWorkerURL);
    setTimeout(() => {
      console.log('starting mongodb worker...');
      this.mongodbWorker.postMessage({ command: Command.Start });
    }, 10_000)

    this.mongodbWorker.onmessage = (event: MessageEvent) => {
      if (event?.data?.command === Command.End) {
        this.mongodbWorker.terminate();
      }
      console.log(event.data?.message);
    }
  }

  createJob(job: NewJob) {
    this.jobList.push({status: Status.Queued, ...job});
  }

  createJobs(jobs: NewJob[]) {
    jobs
      .filter((job) => !this.jobList.find((_job) => _job?.url == job?.url))
      .map((job) => ({status: Status.Queued, ...job} as Job))
      .forEach((job) => this.jobList.push(job))
  }

  getJobs() {
    return [...this.jobList];
  }

  getFromQueue(limit = 5, timeout = 1000) {
    return new Observable<Job[]>((subscriber) => {
      setInterval( async () => {
        const pages = await this._browser?.pages();
        if (limit - pages?.length > 0) {
          const jobsTodo = this.queryJobs(limit - pages?.length);
          if (jobsTodo.length > 0) {
            subscriber.next(jobsTodo);
          } else {
            await this._browser.close();
            subscriber.complete();
          }
        }
      }, timeout);
    })
  }

  executeJobs() {
    return new Observable((subscriber) => {
      this.getFromQueue().subscribe({
        next: async (jobsTodo: Job[]) => {
          for await (const job of jobsTodo) {
            const found = await VesselSchema.model.findOne({ vessel_name: job.name })
            if (found) {
              continue;
            }

            subscriber.next({ message: "Executing " + job.name });
            this.vesselFinder.getVesselDetails(subscriber, this._browser, job, this.mongodbWorker)
              .then((status: Status) => {
                if (status == Status.Failed) {
                  this.failedJobs.push(job);
                }

                console.log('Job ' + job.name + ' executed: ' + status);
                const index = this.jobList.findIndex((_job) => _job.name == job.name);
                this.jobList[index] = { ...job, status };
              });
          }
        },
        complete: () => {
          subscriber.complete();
        }
      })
    })
  }

  queryJobs(limit = 3) {
    const list = this.jobList.filter((job) => job.status == Status.Queued)
      .slice(0, limit);
    list.forEach((item) => {
      const index = this.jobList.findIndex((job) => job.url === item.url);
      this.jobList[index].status = Status.Processing;
    })
    return list;
  }
}