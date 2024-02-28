import {VesselFinderScraper} from "./vessel-finder.scraper.ts";

const vf = VesselFinderScraper.getInstance<VesselFinderScraper>(VesselFinderScraper);
vf.mock().subscribe((status) => console.log(status));

process.exit(0);