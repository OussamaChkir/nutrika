// Registry of additive explanations. Every JSON file in ./data must be listed here
// (lib/additives/additives.test.ts fails if one is missing), so bundlers see static imports.

import { additiveInfoSchema, type AdditiveInfo } from "./schema";

import e102 from "./data/e102.json";
import e104 from "./data/e104.json";
import e110 from "./data/e110.json";
import e120 from "./data/e120.json";
import e122 from "./data/e122.json";
import e124 from "./data/e124.json";
import e129 from "./data/e129.json";
import e150a from "./data/e150a.json";
import e150d from "./data/e150d.json";
import e202 from "./data/e202.json";
import e211 from "./data/e211.json";
import e223 from "./data/e223.json";
import e250 from "./data/e250.json";
import e300 from "./data/e300.json";
import e322 from "./data/e322.json";
import e338 from "./data/e338.json";
import e450 from "./data/e450.json";
import e451 from "./data/e451.json";
import e471 from "./data/e471.json";
import e621 from "./data/e621.json";
import e950 from "./data/e950.json";
import e951 from "./data/e951.json";
import e965 from "./data/e965.json";

const RAW: readonly unknown[] = [
    e102,
    e104,
    e110,
    e120,
    e122,
    e124,
    e129,
    e150a,
    e150d,
    e202,
    e211,
    e223,
    e250,
    e300,
    e322,
    e338,
    e450,
    e451,
    e471,
    e621,
    e950,
    e951,
    e965,
];

/** Validated at load time: a malformed file fails fast (and in the tests), never at render time. */
export const ADDITIVES: readonly AdditiveInfo[] = RAW.map((entry) => additiveInfoSchema.parse(entry));
