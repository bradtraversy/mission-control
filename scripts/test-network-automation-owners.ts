import * as assert from "node:assert/strict";
import { normalizeNetworkAutomationOwner } from "../src/lib/parsers/network";

assert.equal(normalizeNetworkAutomationOwner("travis"), null);
assert.equal(normalizeNetworkAutomationOwner(" Travis "), null);
assert.equal(normalizeNetworkAutomationOwner("sysadmin"), "sysadmin");
assert.equal(normalizeNetworkAutomationOwner(undefined), null);

console.log("network automation owner tests passed");
