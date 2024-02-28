import {VesselFinderScraper} from "./vessel-finder.scraper.ts";
import {Command, WorkerMessage} from "./command.ts";
import {mongoose} from "@typegoose/typegoose";
import {VesselSchema} from "./vessel.schema.ts";

console.log('Connecting to db...');
const url = 'mongodb://127.0.0.1:27017/'
await mongoose.connect(url, {
  dbName: 'test',
});

const workerURL = new URL("worker.ts", import.meta.url).href;
const worker = new Worker(workerURL);
console.log('starting worker...');

worker.onmessage = (event: MessageEvent) => {
  if (event.data.command == Command.End) {
    console.log('Exiting...')
    worker.terminate();
    process.exit(0);
  }
};

const vf = VesselFinderScraper.getInstance<VesselFinderScraper>(VesselFinderScraper);
vf.gatherVessels(worker);

setTimeout(() => {
  worker.postMessage({ command: Command.Start } as WorkerMessage)
}, 5_000)
