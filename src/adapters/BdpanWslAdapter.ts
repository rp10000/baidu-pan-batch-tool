import { BdpanCliAdapter } from "./BdpanCliAdapter";
import type { BdpanCommandRunner } from "../services/BdpanCommandRunner";

export class BdpanWslAdapter extends BdpanCliAdapter {
  constructor(runner: BdpanCommandRunner) {
    super(runner);
  }
}
