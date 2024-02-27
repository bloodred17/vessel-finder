import {Injectable} from "anti-di";
import {Observable} from "rxjs";
import puppeteer, {Browser} from "puppeteer";
import {VesselFinderScraper} from "./scrape.ts";
import MessageEvent = Bun.MessageEvent;
import {Command} from "./command.ts";

export interface Job {
  name: string,
  url: string,
}

export enum Status {
  Queued = 'queued',
  Processing = 'processing',
  Done = 'done',
  Failed = 'failed'
}


export class Jobs extends Injectable {
  private jobList: (Job & {status: Status})[] = [];
  private failedJobs: (Job & {status: Status})[] = []
  private _browser!: Browser
  private vesselFinder = VesselFinderScraper.getInstance<VesselFinderScraper>(VesselFinderScraper);
  readonly mongodbWorker: Worker;

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

  createJob(job: Job) {
    this.jobList.push({status: Status.Queued, ...job});
  }

  createJobs(jobs: Job[]) {
    jobs.map((job) => ({status: Status.Queued, ...job}))
      .forEach((job) => this.jobList.push(job))
  }

  getJobs() {
    return [...this.jobList];
  }

  executeJobs() {
    return new Observable((subscriber) => {
      setInterval(async () => {
        const jobsTodo = this.queryJobs();
        if (jobsTodo.length == 0) {
          await this._browser.close();
          subscriber.complete();
        }

        // Execute
        for (const job of jobsTodo) {
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
        
      }, 5_000)
    })
  }

  queryJobs(limit = 3) {
    return this.jobList.filter((job) => job.status == Status.Queued)
      .slice(0, limit)
  }
}