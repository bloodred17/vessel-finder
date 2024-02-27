import puppeteer, {Browser} from "puppeteer";
import $ from "jquery"
import {Injectable} from "anti-di";
import {Command, WorkerMessage} from "./command.ts";
import {Subscriber} from "rxjs";
import {Job, Status} from "./jobs.ts";
import {VesselSchema} from "./vessel.schema.ts";
import {Schema} from "mongoose";
import { appendFile } from "node:fs/promises";


export class VesselFinderScraper extends Injectable {
  domain = 'https://www.vesselfinder.com'
  url = 'https://www.vesselfinder.com/vessels?type=403'

  async getVesselDetails(subscriber: Subscriber<unknown>, browser: Browser, job: Job & {status: Status}, mongodbWorker: Worker) {
    const page = await browser?.newPage();
    try {
      subscriber.next({ message: 'Processing ' + job?.name });
      await page.goto(this.domain + job?.url, { waitUntil: 'domcontentloaded' });
      await page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.7.1.min.js' });

      const details = await page.evaluate(() => {
        // const $ = window.$;
        const _details: any = {}
        const exp = (field: string) => $(`td:contains(${field})`)?.last()?.next()?.text()?.trim();
        _details.imo_number = exp('IMO number');
        _details.vessel_name = exp('Vessel Name');
        _details.ship_type = exp('Ship type');
        _details.flag = exp('Flag');
        _details.gross_tonnage = exp('Gross Tonnage');
        _details.length_overall = exp('Summer Deadweight');
        _details.year_of_build = exp('Year of Build');
        _details.mmsi = exp('IMO / MMSI')?.split('/')?.at(-1)?.trim();
        _details.callsign = exp('Callsign');
        return _details;
      });

      console.log(details)
      const date = new Date();

      await appendFile(`./output/${details?.year_of_build}_log.txt`, JSON.stringify(details) + ',\n');

      await page?.close();
      return Status.Done;
    } catch (e) {
      console.log(e)
      await page?.close();
      return Status.Failed;
    }
  }

  async gatherVessels(worker: Worker) {
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--start-maximized'],
      defaultViewport: null,
    });
    const page = await browser.newPage();

    try {
      const startDate = 2024;
      const endDate = 1999;

      for await (const index of Object.keys(Array.from(Array(startDate - endDate)))) {
        const max = startDate - parseInt(index);
        const min = startDate - parseInt(index) - 1;

        const url = this.url + `&minYear=${min}&maxYear=${max}`;
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.7.1.min.js' });

        const totalPages = await page.evaluate(() => {
          return $('.pagination span:contains("page")')?.last()?.text()?.trim()?.split('/')?.at(-1);
        });
        console.log(totalPages)

        if (totalPages) {
          for await (const index of Object.keys(Array.from(Array(+totalPages)))) {
            await page.goto(url + '&page=' + (+index + 1), { waitUntil: 'domcontentloaded' });
            await page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.7.1.min.js' });

            await page.waitForSelector('table.results');
            const entries = await page.evaluate(() => {
              const rows: any[] = []
              $('table.results tbody tr').each(function (this) {
                rows.push({
                  name: $(this)?.find('.slna')?.text()?.trim(),
                  url: $(this)?.find('.ship-link')?.attr('href'),
                })
              });
              return rows;
            });

            worker.postMessage({
              command: Command.CreateJobs,
              data: entries,
            } as WorkerMessage)
          }
        }

      }

      await page?.close();
      await browser?.close();
    } catch (e) {
      console.log(e)

      await page?.close();
      await browser?.close();
    }
  }
}