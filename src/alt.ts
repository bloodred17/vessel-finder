import {VesselFinderScraper} from "./vessel-finder.scraper.ts";

const vf = VesselFinderScraper.getInstance<VesselFinderScraper>(VesselFinderScraper);
vf.mock().subscribe({
  next: (status) => console.log(status),
  complete: () => process.exit(0),
});

