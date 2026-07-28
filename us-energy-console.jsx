import React, { useState, useMemo, useRef } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, BarChart, Bar, Cell, LabelList,
} from "recharts";

/* ==========================================================================
   US ENERGY CONSOLE
   Supply · Demand · Consumption — national, state, and county views

   Reference dataset is embedded (offline). See the Method tab for vintages,
   units, and the county apportionment model. Figures are rounded reference
   values in the shape of EIA SEDS / Electric Power Annual / Form EIA-861 and
   are intended for orientation and comparison, not for compliance filings.
   ========================================================================== */

/* ---------- design tokens ------------------------------------------------ */
const T = {
  bg: "#0A1116",
  panel: "#0F1A21",
  panel2: "#132630",
  line: "#1C313C",
  line2: "#28454F",
  text: "#DCE9EF",
  dim: "#7E9AA7",
  faint: "#4E6C79",
  amber: "#F0A238",
  cyan: "#43D0D8",
  red: "#E4585C",
  green: "#57C77E",
  violet: "#A98BF5",
};
const MONO = `ui-monospace, "SFMono-Regular", "Roboto Mono", Menlo, Consolas, monospace`;
const SANS = `ui-sans-serif, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

const FUELS = [
  { k: "coal", label: "Coal", c: "#7D8A93" },
  { k: "gas", label: "Natural gas", c: "#E8833A" },
  { k: "nuc", label: "Nuclear", c: "#A98BF5" },
  { k: "hyd", label: "Hydro", c: "#3B9EE8" },
  { k: "wind", label: "Wind", c: "#43D0D8" },
  { k: "sol", label: "Solar", c: "#FFD84D" },
  { k: "geo", label: "Geothermal", c: "#F0655F" },
  { k: "bio", label: "Biomass", c: "#8CBF3F" },
  { k: "oil", label: "Petroleum", c: "#6B5B52" },
  { k: "oth", label: "Other", c: "#4A6270" },
];
const RENEW = ["hyd", "wind", "sol", "geo", "bio"];
const SECTORS = [
  { k: "res", label: "Residential", c: "#43D0D8" },
  { k: "com", label: "Commercial", c: "#A98BF5" },
  { k: "ind", label: "Industrial", c: "#F0A238" },
  { k: "trans", label: "Transportation", c: "#57C77E" },
];

/* ---------- state reference table ---------------------------------------
   code|name|region|pop(thousands, 2023)|consumption(trillion Btu, 2022)
   |res%|com%|ind%|trans%
   |coal|gas|nuc|hyd|wind|sol|geo|bio|oil|oth   (net generation, TWh, 2023)
   |retail sales(TWh)|residential ¢/kWh|commercial ¢/kWh|industrial ¢/kWh
   |energy CO2 (million metric tons)|total energy production(trillion Btu)
------------------------------------------------------------------------- */
const STATE_CSV = `
AL|Alabama|ESC|5108|2000|17|13|40|30|24|76|41|8|0|3|0|4|0.2|0.5|93|14.8|13.0|7.0|118|1300
AK|Alaska|PAC|733|600|10|15|45|30|0.5|4.0|0|1.6|0.1|0|0|0|0.6|0|6.0|24.5|21.5|18.0|35|1900
AZ|Arizona|MTN|7431|1600|20|17|20|43|15|45|32|6|0.7|8|0|0.2|0.1|0.3|86|14.2|11.0|7.2|95|400
AR|Arkansas|WSC|3067|1200|17|12|40|31|14|22|14|2.5|0|1.5|0|1|0.1|0.2|49|12.4|10.2|6.8|65|1100
CA|California|PAC|38965|7600|15|16|22|47|0.3|96|17|25|14|48|11|5|0.1|1|281|29.5|25.0|20.0|330|2100
CO|Colorado|MTN|5877|1600|18|17|30|35|15|17|0|1.7|15|3|0|0.2|0.1|0.3|57|14.5|11.5|8.5|88|3700
CT|Connecticut|NE|3617|700|22|22|16|40|0.1|22|16|0.5|0|1.2|0|1|0.3|0.2|28|28.8|22.0|17.0|31|60
DE|Delaware|SA|1032|250|19|18|27|36|0.1|6.5|0|0|0|0.2|0|0.1|0.1|0.1|11.5|15.5|12.0|9.0|12|10
DC|District of Columbia|SA|679|150|20|55|3|22|0|0.1|0|0|0|0.1|0|0|0|0|11|16.5|14.5|12.0|8|2
FL|Florida|SA|22611|4500|20|18|12|50|9|194|31|0.2|0|20|0|3|1|2|250|15.4|12.0|9.5|240|200
GA|Georgia|SA|11029|3100|18|15|32|35|19|62|42|3|0|8|0|3|0.3|1|139|14.0|11.5|7.0|130|500
HI|Hawaii|PAC|1435|250|10|15|15|60|0.5|0|0|0.1|0.6|0.7|0.2|0.3|6.5|0.1|9.5|42.0|39.0|36.0|17|10
ID|Idaho|MTN|1964|600|17|14|34|35|0|3.5|0|10.5|2.5|0.6|0.4|0.4|0|0.1|26|11.2|8.8|7.2|20|200
IL|Illinois|ENC|12549|3900|19|17|31|33|21|30|97|0.1|20|2|0|0.3|0.1|1|140|15.5|10.5|7.5|190|1600
IN|Indiana|ENC|6862|2800|15|12|46|27|46|40|0|0.5|9|2|0|0.4|0.2|1|106|14.8|11.5|8.0|180|700
IA|Iowa|WNC|3208|1600|13|11|47|29|13|6|0|1|42|0.3|0|0.3|0.1|0.3|51|13.5|11.0|7.0|78|800
KS|Kansas|WNC|2941|1100|14|12|42|32|12|4|9|0.1|24|0.1|0|0.1|0.1|0.2|41|14.0|11.0|8.0|62|900
KY|Kentucky|ESC|4526|1800|15|12|42|31|41|20|0|3|0|0.3|0|0.2|0.2|0.5|74|12.5|11.0|6.5|110|900
LA|Louisiana|WSC|4574|5000|8|7|65|20|6|82|17|0.8|0|0.6|0|1.5|0.3|1|96|12.0|10.5|6.5|205|6800
ME|Maine|NE|1395|400|22|17|26|35|0|2.5|0|3.9|2.4|0.6|0|2.2|0.2|0.1|12|25.0|19.0|14.0|16|100
MD|Maryland|SA|6180|1300|22|22|14|42|3|12|14|1.6|0.4|1.5|0|0.5|0.2|0.3|60|16.5|12.5|9.0|55|100
MA|Massachusetts|NE|7002|1400|23|22|14|41|0|20|0|1|0.3|3.5|0|0.8|0.2|0.3|55|29.5|24.0|20.0|60|100
MI|Michigan|ENC|10037|2900|21|17|30|32|24|40|27|1.4|8|1|0|1.2|0.2|1|105|18.5|12.5|8.5|145|400
MN|Minnesota|WNC|5738|1900|17|15|37|31|12|12|13|0.7|13|2.5|0|1|0.1|0.7|70|14.5|11.5|8.5|90|400
MS|Mississippi|ESC|2940|1200|15|12|40|33|3|51|11|0|0|1.4|0|1.5|0.1|0.3|51|13.0|11.0|7.0|65|500
MO|Missouri|WNC|6196|1800|19|17|30|34|39|10|9|1.6|4.5|0.3|0|0.2|0.2|0.5|79|12.5|10.0|7.5|110|200
MT|Montana|MTN|1133|450|14|13|40|33|10|0.6|0|11|3.5|0.1|0|0.1|0.1|0.1|15|12.5|11.0|6.5|30|900
NE|Nebraska|WNC|1978|900|14|12|43|31|16|2|9|1.3|8|0.1|0|0.1|0.1|0.2|32|11.5|9.5|8.0|47|300
NV|Nevada|MTN|3194|800|17|20|25|38|1.5|24|0|2.5|0.3|8|4|0.1|0.1|0.2|41|15.0|10.5|8.0|40|100
NH|New Hampshire|NE|1402|300|22|19|20|39|0.2|3|10|1.3|0.6|0.2|0|1|0.1|0.1|11|27.5|21.0|16.0|13|50
NJ|New Jersey|MA|9291|2300|18|19|22|41|0.1|40|31|0.1|0|4|0|0.8|0.2|0.5|76|18.5|15.0|12.0|100|100
NM|New Mexico|MTN|2114|800|12|13|40|35|6|12|0|0.2|10|3|0|0.1|0.1|0.2|26|14.0|11.0|6.5|55|3500
NY|New York|MA|19571|3700|21|24|13|42|0.1|55|26|29|5|2.5|0|1.5|0.5|1|145|23.0|18.0|8.0|155|200
NC|North Carolina|SA|10835|2800|19|16|30|35|14|55|45|4|0.7|11|0|1|0.2|1|138|13.0|9.5|7.0|115|200
ND|North Dakota|WNC|783|800|8|9|62|21|22|2|0|2|12|0|0|0|0.1|0.2|20|10.5|9.5|8.0|55|4400
OH|Ohio|ENC|11785|3700|17|15|38|30|32|82|17|0.5|1.6|1.5|0|0.3|0.2|1|150|14.5|11.0|7.5|195|2000
OK|Oklahoma|WSC|4053|1800|14|13|42|31|5|40|0|3|34|0.4|0|0.1|0.1|0.3|62|12.5|10.0|6.0|100|4300
OR|Oregon|PAC|4233|1100|18|17|30|35|0.2|12|0|34|8|1.4|0.2|0.7|0.1|0.3|48|12.5|10.0|7.0|40|300
PA|Pennsylvania|MA|12961|3700|16|15|36|33|12|133|76|2.5|4|0.8|0|1|0.3|3|145|17.5|10.0|8.0|200|9500
RI|Rhode Island|NE|1096|200|20|21|12|47|0|6.5|0|0|0.3|0.5|0|0.1|0.1|0.1|7.5|28.0|21.5|17.0|10|20
SC|South Carolina|SA|5373|1700|18|14|35|33|8|27|51|2.5|0|3|0|1.5|0.2|0.5|84|14.0|11.0|6.5|70|200
SD|South Dakota|WNC|920|450|14|13|42|31|2|1.5|0|4.5|8|0|0|0|0.1|0.1|13|12.5|10.5|8.5|17|200
TN|Tennessee|ESC|7126|2300|17|14|37|32|12|25|33|10|0.1|1.2|0|0.5|0.2|0.5|100|12.5|11.0|7.5|105|200
TX|Texas|WSC|30503|14700|9|8|58|25|65|275|41|1|119|31|0|1|0.5|3|465|14.5|9.0|6.0|700|22000
UT|Utah|MTN|3417|900|15|15|38|32|12|12|0|0.9|0.6|3.5|0.5|0.1|0.1|0.3|33|11.5|9.0|6.5|60|900
VT|Vermont|NE|647|130|24|22|18|36|0|0|0|1.1|0.3|0.4|0|0.4|0|0.1|5.5|21.0|18.0|14.0|6|20
VA|Virginia|SA|8716|2500|19|22|21|38|3|55|30|1.5|0|5|0|2.5|0.3|1|120|14.0|9.0|7.0|100|300
WA|Washington|PAC|7812|2000|18|17|30|35|3|12|9|75|8|0.2|0|1.5|0.1|0.5|92|11.0|9.5|5.5|65|900
WV|West Virginia|SA|1770|800|13|11|51|25|45|3|0|1.6|1.5|0.1|0|0.1|0.1|0.3|29|14.0|11.0|7.5|78|3400
WI|Wisconsin|ENC|5911|1800|18|16|36|30|15|22|10|1.5|1.6|1|0|0.6|0.1|0.5|70|16.0|12.0|8.5|90|200
WY|Wyoming|MTN|585|600|6|9|60|25|27|1.5|0|1|12|0.1|0|0|0.1|0.1|17|11.5|10.0|7.0|60|9500
`.trim();

const REGION_NAMES = {
  PAC: "Pacific", MTN: "Mountain", WNC: "West North Central",
  WSC: "West South Central", ENC: "East North Central",
  ESC: "East South Central", SA: "South Atlantic",
  MA: "Middle Atlantic", NE: "New England",
};

/* ---------- county population reference (thousands, ~2023) ---------------
   Largest counties per state; the remainder is rolled into "Balance of state".
------------------------------------------------------------------------- */
const COUNTY_CSV = `
AL:Jefferson,675;Mobile,414;Madison,407;Baldwin,253;Tuscaloosa,232;Shelby,231;Montgomery,226;Lee,180;Morgan,125;Houston,110
AK:Anchorage,288;Matanuska-Susitna,111;Fairbanks North Star,95;Kenai Peninsula,60;Juneau,32;Bethel,18;Kodiak Island,13;Nome,10
AZ:Maricopa,4551;Pima,1063;Pinal,464;Yavapai,244;Mohave,217;Yuma,204;Coconino,145;Cochise,125;Navajo,107;Apache,66
AR:Pulaski,398;Benton,297;Washington,253;Saline,128;Sebastian,128;Faulkner,126;Craighead,113;Garland,100;White,79;Lonoke,74
CA:Los Angeles,9761;San Diego,3269;Orange,3151;Riverside,2418;San Bernardino,2181;Santa Clara,1878;Alameda,1622;Sacramento,1585;Contra Costa,1156;Fresno,1013;Kern,917;Ventura,829;San Francisco,809;San Joaquin,789;Stanislaus,552
CO:El Paso,730;Denver,713;Arapahoe,656;Jefferson,578;Adams,528;Douglas,379;Larimer,366;Weld,350;Boulder,327;Pueblo,169
CT:Fairfield,962;Hartford,900;New Haven,863;New London,268;Litchfield,185;Middlesex,165;Tolland,150;Windham,117
DE:New Castle,578;Sussex,256;Kent,187
DC:District of Columbia,679
FL:Miami-Dade,2686;Broward,1946;Palm Beach,1533;Hillsborough,1509;Orange,1450;Duval,1017;Pinellas,962;Lee,834;Polk,787;Brevard,630;Pasco,626;Volusia,596;Seminole,476;Sarasota,464
GA:Fulton,1066;Gwinnett,981;Cobb,771;DeKalb,762;Chatham,305;Clayton,297;Cherokee,281;Forsyth,267;Henry,253;Hall,210;Richmond,205;Muscogee,205
HI:Honolulu,990;Hawaii,206;Maui,165;Kauai,74
ID:Ada,526;Canyon,251;Kootenai,179;Bonneville,130;Twin Falls,93;Bannock,89;Madison,53;Nez Perce,42
IL:Cook,5087;DuPage,933;Lake,711;Will,700;Kane,517;McHenry,310;Winnebago,284;Madison,264;St. Clair,255;Champaign,207;Sangamon,195;Peoria,179
IN:Marion,969;Lake,496;Allen,398;Hamilton,366;St. Joseph,273;Elkhart,207;Tippecanoe,195;Hendricks,183;Vanderburgh,178;Porter,174
IA:Polk,500;Linn,231;Scott,174;Johnson,155;Black Hawk,132;Dallas,108;Woodbury,106;Dubuque,99;Story,98;Pottawattamie,93
KS:Johnson,620;Sedgwick,526;Shawnee,178;Wyandotte,168;Douglas,119;Leavenworth,83;Riley,71;Butler,68
KY:Jefferson,772;Fayette,323;Kenton,170;Warren,138;Boone,137;Hardin,114;Daviess,103;Campbell,94
LA:East Baton Rouge,456;Jefferson,421;Orleans,364;St. Tammany,274;Lafayette,245;Caddo,233;Calcasieu,216;Ouachita,160;Livingston,145;Rapides,129
ME:Cumberland,306;York,219;Penobscot,152;Kennebec,125;Androscoggin,113;Aroostook,67;Oxford,59;Hancock,55
MD:Montgomery,1051;Prince George's,947;Baltimore County,850;Anne Arundel,590;Baltimore City,565;Howard,336;Frederick,285;Harford,262;Carroll,174;Charles,172
MA:Middlesex,1637;Worcester,869;Essex,813;Suffolk,771;Norfolk,733;Bristol,583;Plymouth,536;Hampden,465
MI:Wayne,1770;Oakland,1280;Macomb,877;Kent,662;Genesee,405;Washtenaw,372;Ottawa,302;Ingham,285;Kalamazoo,262;Livingston,200
MN:Hennepin,1270;Ramsey,545;Dakota,448;Anoka,372;Washington,279;St. Louis,199;Olmsted,165;Stearns,163;Scott,155;Wright,149
MS:Hinds,218;Harrison,209;DeSoto,190;Rankin,161;Jackson,143;Madison,111;Lee,84;Forrest,79
MO:St. Louis County,987;Jackson,718;St. Charles,415;Greene,300;St. Louis City,281;Clay,261;Jefferson,229;Boone,187;Jasper,124;Franklin,105
MT:Yellowstone,168;Gallatin,126;Missoula,120;Flathead,112;Cascade,84;Lewis and Clark,74;Ravalli,47;Silver Bow,35
NE:Douglas,592;Lancaster,327;Sarpy,195;Hall,62;Buffalo,51;Dodge,37;Scotts Bluff,36;Madison,35
NV:Clark,2331;Washoe,496;Lyon,61;Carson City,59;Nye,55;Elko,54;Douglas,50;Churchill,26
NH:Hillsborough,428;Rockingham,320;Merrimack,156;Strafford,133;Grafton,92;Cheshire,76;Belknap,64;Carroll,51
NJ:Bergen,953;Middlesex,863;Essex,851;Hudson,705;Ocean,660;Monmouth,644;Union,573;Camden,526;Passaic,519;Morris,512
NM:Bernalillo,673;Dona Ana,223;Santa Fe,156;Sandoval,152;San Juan,121;Valencia,77;Lea,74;McKinley,71
NY:Kings,2646;Queens,2278;New York,1597;Suffolk,1523;Nassau,1382;Bronx,1379;Westchester,990;Erie,951;Monroe,754;Richmond,490;Onondaga,475;Orange,408
NC:Wake,1176;Mecklenburg,1149;Guilford,549;Forsyth,393;Cumberland,337;Durham,335;Buncombe,273;Union,250;Gaston,235;New Hanover,234
ND:Cass,190;Burleigh,100;Grand Forks,74;Ward,69;Williams,41;Stark,35;Morton,34;Stutsman,21
OH:Franklin,1326;Cuyahoga,1233;Hamilton,833;Montgomery,537;Summit,537;Lucas,428;Butler,397;Stark,375;Lorain,315;Warren,249
OK:Oklahoma,806;Tulsa,673;Cleveland,300;Canadian,168;Comanche,121;Rogers,98;Wagoner,83;Payne,82
OR:Multnomah,795;Washington,600;Clackamas,425;Lane,384;Marion,348;Jackson,224;Deschutes,208;Linn,132
PA:Philadelphia,1550;Allegheny,1245;Montgomery,866;Bucks,645;Delaware,576;Lancaster,557;Chester,545;York,464;Berks,434;Lehigh,379;Westmoreland,353;Luzerne,328
RI:Providence,662;Kent,168;Washington,130;Newport,85;Bristol,51
SC:Greenville,546;Charleston,421;Richland,419;Horry,396;Spartanburg,353;Lexington,306;York,300;Berkeley,249
SD:Minnehaha,209;Pennington,116;Lincoln,71;Brown,39;Brookings,36;Codington,30;Meade,30;Lawrence,26
TN:Shelby,913;Davidson,715;Knox,494;Hamilton,375;Rutherford,366;Williamson,262;Montgomery,233;Sumner,208;Wilson,158;Sevier,100
TX:Harris,4835;Dallas,2606;Tarrant,2182;Bexar,2059;Travis,1326;Collin,1195;Denton,1006;Fort Bend,916;Hidalgo,888;El Paso,866;Montgomery,749;Williamson,671;Cameron,425;Bell,397;Nueces,355
UT:Salt Lake,1186;Utah,733;Davis,373;Weber,273;Washington,197;Cache,137;Tooele,79;Iron,61
VT:Chittenden,170;Rutland,60;Washington,59;Windsor,57;Franklin,51;Windham,45;Addison,37;Bennington,37
VA:Fairfax,1150;Prince William,484;Virginia Beach,455;Loudoun,439;Chesterfield,386;Henrico,335;Chesapeake,252;Arlington,238;Norfolk,231;Richmond City,229
WA:King,2266;Pierce,928;Snohomish,833;Spokane,549;Clark,516;Thurston,302;Kitsap,279;Yakima,256;Whatcom,232;Benton,213
WV:Kanawha,176;Berkeley,128;Monongalia,105;Cabell,92;Wood,84;Raleigh,73;Harrison,65;Jefferson,59
WI:Milwaukee,917;Dane,575;Waukesha,411;Brown,271;Racine,197;Outagamie,194;Winnebago,172;Kenosha,169;Rock,164;Marathon,139
WY:Laramie,101;Natrona,79;Campbell,47;Sweetwater,42;Albany,39;Fremont,39;Sheridan,32;Park,30
`.trim();

/* ---------- national net generation trend (TWh, approximate) ------------ */
const TREND = [
  { y: 2015, coal: 1352, gas: 1335, nuc: 797, hyd: 250, wind: 191, sol: 39, oth: 131 },
  { y: 2016, coal: 1240, gas: 1380, nuc: 806, hyd: 267, wind: 227, sol: 56, oth: 128 },
  { y: 2017, coal: 1206, gas: 1296, nuc: 805, hyd: 300, wind: 254, sol: 77, oth: 124 },
  { y: 2018, coal: 1150, gas: 1468, nuc: 807, hyd: 292, wind: 273, sol: 96, oth: 128 },
  { y: 2019, coal: 966, gas: 1586, nuc: 809, hyd: 288, wind: 295, sol: 106, oth: 119 },
  { y: 2020, coal: 774, gas: 1624, nuc: 790, hyd: 291, wind: 338, sol: 131, oth: 115 },
  { y: 2021, coal: 899, gas: 1579, nuc: 778, hyd: 260, wind: 380, sol: 165, oth: 117 },
  { y: 2022, coal: 828, gas: 1689, nuc: 772, hyd: 255, wind: 435, sol: 205, oth: 120 },
  { y: 2023, coal: 675, gas: 1802, nuc: 775, hyd: 240, wind: 425, sol: 238, oth: 113 },
  { y: 2024, coal: 653, gas: 1855, nuc: 782, hyd: 246, wind: 453, sol: 303, oth: 112 },
  { y: 2025, coal: 620, gas: 1830, nuc: 790, hyd: 250, wind: 480, sol: 370, oth: 111 },
];

/* ---------- tile cartogram grid ------------------------------------------ */
const GRID = {
  AK: [0, 0], ME: [0, 11],
  VT: [1, 10], NH: [1, 11],
  WA: [2, 0], ID: [2, 1], MT: [2, 2], ND: [2, 3], MN: [2, 4], IL: [2, 5],
  WI: [2, 6], MI: [2, 8], NY: [2, 9], RI: [2, 10], MA: [2, 11],
  OR: [3, 0], NV: [3, 1], WY: [3, 2], SD: [3, 3], IA: [3, 4], IN: [3, 5],
  OH: [3, 6], PA: [3, 7], NJ: [3, 8], CT: [3, 9],
  CA: [4, 0], UT: [4, 1], CO: [4, 2], NE: [4, 3], MO: [4, 4], KY: [4, 5],
  WV: [4, 6], VA: [4, 7], MD: [4, 8], DE: [4, 9],
  AZ: [5, 1], NM: [5, 2], KS: [5, 3], AR: [5, 4], TN: [5, 5], NC: [5, 6],
  SC: [5, 7], DC: [5, 8],
  OK: [6, 3], LA: [6, 4], MS: [6, 5], AL: [6, 6], GA: [6, 7],
  HI: [7, 0], TX: [7, 3], FL: [7, 8],
};

/* ---------- parse + derive ----------------------------------------------- */
function buildStates() {
  return STATE_CSV.split("\n").map((row) => {
    const f = row.split("|");
    const n = (i) => parseFloat(f[i]);
    const pop = n(3) * 1000;
    const cons = n(4);
    const gen = {
      coal: n(9), gas: n(10), nuc: n(11), hyd: n(12), wind: n(13),
      sol: n(14), geo: n(15), bio: n(16), oil: n(17), oth: n(18),
    };
    const genTotal = FUELS.reduce((a, x) => a + gen[x.k], 0);
    const use = {
      res: (cons * n(5)) / 100, com: (cons * n(6)) / 100,
      ind: (cons * n(7)) / 100, trans: (cons * n(8)) / 100,
    };
    const retail = n(19);
    const renewGen = RENEW.reduce((a, k) => a + gen[k], 0);
    const prod = n(24);
    return {
      code: f[0], name: f[1], region: f[2], pop, cons, use, gen, genTotal,
      retail, renewGen, cleanGen: renewGen + gen.nuc,
      priceRes: n(20), priceCom: n(21), priceInd: n(22),
      co2: n(23), prod,
      net: genTotal - retail,
      perCapita: (cons * 1e6) / pop,          // million Btu per person
      kwhPerCapita: (retail * 1e9) / pop,     // kWh per person
      renewShare: genTotal ? (renewGen / genTotal) * 100 : 0,
      cleanShare: genTotal ? ((renewGen + gen.nuc) / genTotal) * 100 : 0,
      selfSuff: cons ? (prod / cons) * 100 : 0,
      co2Intensity: cons ? (n(23) * 1e6) / (cons * 1e3) : 0, // kg CO2 per MMBtu
    };
  });
}

function buildCounties() {
  const map = {};
  COUNTY_CSV.split("\n").forEach((row) => {
    const [code, list] = row.split(":");
    map[code] = list.split(";").map((c) => {
      const [name, pop] = c.split(",");
      return { name, pop: parseFloat(pop) * 1000 };
    });
  });
  return map;
}

const STATES = buildStates();
const COUNTIES = buildCounties();
const BY_CODE = Object.fromEntries(STATES.map((s) => [s.code, s]));

/* National roll-up computed from the same state rows, so every view ties out */
const NATION = (() => {
  const gen = {};
  FUELS.forEach((f) => (gen[f.k] = STATES.reduce((a, s) => a + s.gen[f.k], 0)));
  const use = {};
  SECTORS.forEach((x) => (use[x.k] = STATES.reduce((a, s) => a + s.use[x.k], 0)));
  const pop = STATES.reduce((a, s) => a + s.pop, 0);
  const cons = STATES.reduce((a, s) => a + s.cons, 0);
  const retail = STATES.reduce((a, s) => a + s.retail, 0);
  const genTotal = FUELS.reduce((a, f) => a + gen[f.k], 0);
  const renewGen = RENEW.reduce((a, k) => a + gen[k], 0);
  const co2 = STATES.reduce((a, s) => a + s.co2, 0);
  const prod = STATES.reduce((a, s) => a + s.prod, 0);
  const wAvg = (key) => STATES.reduce((a, s) => a + s[key] * s.retail, 0) / retail;
  return {
    code: "US", name: "United States", region: "ALL", pop, cons, use, gen, genTotal,
    retail, renewGen, cleanGen: renewGen + gen.nuc,
    priceRes: wAvg("priceRes"), priceCom: wAvg("priceCom"), priceInd: wAvg("priceInd"),
    co2, prod, net: genTotal - retail,
    perCapita: (cons * 1e6) / pop,
    kwhPerCapita: (retail * 1e9) / pop,
    renewShare: (renewGen / genTotal) * 100,
    cleanShare: ((renewGen + gen.nuc) / genTotal) * 100,
    selfSuff: (prod / cons) * 100,
    co2Intensity: (co2 * 1e6) / (cons * 1e3),
  };
})();

/* County apportionment model — population-weighted, commercial tilted toward
   larger (more urbanized) counties. Documented in the Method tab. */
function countyRows(st) {
  const listed = COUNTIES[st.code] || [];
  const listedPop = listed.reduce((a, c) => a + c.pop, 0);
  const rest = st.pop - listedPop;
  const rows = listed.slice();
  if (rest > st.pop * 0.01) rows.push({ name: "Balance of state", pop: rest, rest: true });

  const maxPop = Math.max(...rows.map((r) => r.pop));
  const wFlat = rows.map((r) => r.pop);
  const wCom = rows.map((r) => r.pop * (0.85 + 0.35 * Math.sqrt(r.pop / maxPop)));
  const sFlat = wFlat.reduce((a, b) => a + b, 0);
  const sCom = wCom.reduce((a, b) => a + b, 0);

  return rows.map((r, i) => {
    const pf = wFlat[i] / sFlat;
    const pc = wCom[i] / sCom;
    const use = {
      res: st.use.res * pf,
      com: st.use.com * pc,
      ind: st.use.ind * pf,
      trans: st.use.trans * pf,
    };
    const cons = use.res + use.com + use.ind + use.trans;
    const blend = pf * 0.75 + pc * 0.25;
    return {
      ...r, use, cons,
      share: (cons / st.cons) * 100,
      retail: st.retail * blend,
      perCapita: (cons * 1e6) / r.pop,
      co2: st.co2 * blend,
      billRes: (st.priceRes / 100) * ((st.retail * blend * 1e9) / r.pop) * 0.38 / 12,
    };
  }).sort((a, b) => b.cons - a.cons);
}

/* ---------- formatting --------------------------------------------------- */
const nf = (n, d = 0) =>
  n === null || n === undefined || Number.isNaN(n)
    ? "—"
    : n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const compact = (n) => {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(a >= 1e4 ? 0 : 1) + "k";
  return nf(n, a < 10 ? 1 : 0);
};
const pct = (n, d = 1) => (Number.isFinite(n) ? n.toFixed(d) + "%" : "—");

/* ---------- primitive UI ------------------------------------------------- */
const Panel = ({ title, tag, right, children, pad = 16, style }) => (
  <section
    style={{
      background: T.panel, border: `1px solid ${T.line}`, borderRadius: 3,
      display: "flex", flexDirection: "column", minWidth: 0, ...style,
    }}
  >
    {title && (
      <header
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "9px 14px",
          borderBottom: `1px solid ${T.line}`, background: "rgba(255,255,255,0.012)",
        }}
      >
        <span style={{ width: 3, height: 12, background: T.amber, flexShrink: 0 }} />
        <h3 style={{
          margin: 0, font: `600 11px/1 ${MONO}`, letterSpacing: "0.16em",
          textTransform: "uppercase", color: T.text,
        }}>{title}</h3>
        {tag && <span style={{ font: `400 10px/1 ${MONO}`, color: T.faint, letterSpacing: "0.08em" }}>{tag}</span>}
        <div style={{ marginLeft: "auto" }}>{right}</div>
      </header>
    )}
    <div style={{ padding: pad, flex: 1, minWidth: 0 }}>{children}</div>
  </section>
);

const Metric = ({ label, value, unit, sub, tone }) => (
  <div style={{
    background: T.panel, border: `1px solid ${T.line}`, borderRadius: 3,
    padding: "12px 14px", minWidth: 0,
  }}>
    <div style={{
      font: `500 9.5px/1.3 ${MONO}`, letterSpacing: "0.15em",
      textTransform: "uppercase", color: T.faint, marginBottom: 8,
    }}>{label}</div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 5, flexWrap: "wrap" }}>
      <span style={{
        font: `500 26px/1 ${MONO}`, color: tone || T.text,
        fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
      }}>{value}</span>
      {unit && <span style={{ font: `400 10.5px/1 ${MONO}`, color: T.dim }}>{unit}</span>}
    </div>
    {sub && <div style={{ font: `400 10.5px/1.5 ${SANS}`, color: T.faint, marginTop: 7 }}>{sub}</div>}
  </div>
);

const Eyebrow = ({ children }) => (
  <div style={{
    font: `500 9.5px/1 ${MONO}`, letterSpacing: "0.18em", textTransform: "uppercase",
    color: T.faint, marginBottom: 10,
  }}>{children}</div>
);

/* Horizontal composition bar — the dispatch stack */
function StackBar({ parts, height = 26, total, showLabels = true }) {
  const sum = total ?? parts.reduce((a, p) => a + p.v, 0);
  if (!sum) return <div style={{ font: `400 11px ${MONO}`, color: T.faint }}>No reported output</div>;
  return (
    <div>
      <div style={{
        display: "flex", height, borderRadius: 2, overflow: "hidden",
        border: `1px solid ${T.line2}`, background: T.bg,
      }}>
        {parts.filter((p) => p.v > 0).map((p) => {
          const w = (p.v / sum) * 100;
          return (
            <div
              key={p.label}
              title={`${p.label}  ${nf(p.v, 1)} ${p.unit || ""} · ${pct(w)}`}
              style={{
                width: `${w}%`, background: p.c, display: "flex",
                alignItems: "center", justifyContent: "center", overflow: "hidden",
                borderRight: `1px solid rgba(0,0,0,0.35)`,
              }}
            >
              {showLabels && w > 7 && (
                <span style={{
                  font: `600 9.5px ${MONO}`, color: "rgba(0,0,0,0.75)",
                  fontVariantNumeric: "tabular-nums",
                }}>{w.toFixed(0)}%</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Legend({ items, cols = 2 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: "5px 14px", marginTop: 12 }}>
      {items.map((p) => (
        <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
          <span style={{ width: 9, height: 9, background: p.c, flexShrink: 0, borderRadius: 1 }} />
          <span style={{ font: `400 11px ${SANS}`, color: T.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.label}</span>
          <span style={{
            marginLeft: "auto", font: `400 11px ${MONO}`, color: T.text,
            fontVariantNumeric: "tabular-nums", flexShrink: 0,
          }}>{nf(p.v, p.v < 10 ? 1 : 0)}</span>
        </div>
      ))}
    </div>
  );
}

/* Ranked horizontal bars */
function RankBars({ rows, valueKey, format, color, onPick, active, max }) {
  const hi = max ?? Math.max(...rows.map((r) => r[valueKey]));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {rows.map((r, i) => {
        const v = r[valueKey];
        const on = active === r.code;
        return (
          <button
            key={r.code || r.name}
            onClick={() => onPick && onPick(r)}
            style={{
              display: "grid", gridTemplateColumns: "20px 132px 1fr 78px", alignItems: "center",
              gap: 8, padding: "3px 5px", background: on ? T.panel2 : "transparent",
              border: `1px solid ${on ? T.line2 : "transparent"}`, borderRadius: 2,
              cursor: onPick ? "pointer" : "default", textAlign: "left", width: "100%",
            }}
          >
            <span style={{ font: `400 10px ${MONO}`, color: T.faint, fontVariantNumeric: "tabular-nums" }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span style={{
              font: `400 11.5px ${SANS}`, color: T.text, whiteSpace: "nowrap",
              overflow: "hidden", textOverflow: "ellipsis",
            }}>{r.name}</span>
            <span style={{ height: 9, background: T.bg, borderRadius: 1, overflow: "hidden", border: `1px solid ${T.line}` }}>
              <span style={{
                display: "block", height: "100%",
                width: `${Math.max(0, (v / hi) * 100)}%`, background: color,
              }} />
            </span>
            <span style={{
              font: `400 11px ${MONO}`, color: T.text, textAlign: "right",
              fontVariantNumeric: "tabular-nums",
            }}>{format(v)}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- the annunciator cartogram (signature element) ---------------- */
const MAP_METRICS = [
  { k: "cons", label: "Total consumption", unit: "trillion Btu", fmt: (v) => compact(v), scale: "seq" },
  { k: "perCapita", label: "Consumption per person", unit: "MMBtu/person", fmt: (v) => nf(v, 0), scale: "seq" },
  { k: "genTotal", label: "Net generation", unit: "TWh", fmt: (v) => nf(v, 0), scale: "seq" },
  { k: "renewShare", label: "Renewable share of generation", unit: "%", fmt: (v) => pct(v, 0), scale: "seq" },
  { k: "cleanShare", label: "Carbon-free share of generation", unit: "%", fmt: (v) => pct(v, 0), scale: "seq" },
  { k: "priceRes", label: "Residential electricity price", unit: "¢/kWh", fmt: (v) => nf(v, 1), scale: "seq" },
  { k: "net", label: "Generation minus retail sales", unit: "TWh", fmt: (v) => (v > 0 ? "+" : "") + nf(v, 0), scale: "div" },
  { k: "selfSuff", label: "Production as share of consumption", unit: "%", fmt: (v) => pct(v, 0), scale: "seq" },
  { k: "co2Intensity", label: "CO₂ per unit energy used", unit: "kg/MMBtu", fmt: (v) => nf(v, 1), scale: "seq" },
];

function tint(t) {
  // deep petrol -> amber ramp
  const stops = [[16, 30, 38], [22, 66, 78], [46, 110, 108], [150, 140, 74], [240, 162, 56]];
  const x = Math.min(0.999, Math.max(0, t)) * (stops.length - 1);
  const i = Math.floor(x), f = x - i;
  const a = stops[i], b = stops[i + 1] || stops[i];
  return `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * f)).join(",")})`;
}
function divTint(t) {
  // t in -1..1 : red (net importer) -> neutral -> cyan (net exporter)
  if (t >= 0) {
    const s = Math.min(1, t);
    return `rgb(${Math.round(20 + 47 * s)},${Math.round(38 + 170 * s)},${Math.round(46 + 170 * s)})`;
  }
  const s = Math.min(1, -t);
  return `rgb(${Math.round(20 + 208 * s)},${Math.round(38 + 50 * s)},${Math.round(46 + 46 * s)})`;
}

function Cartogram({ metric, selected, onSelect, hover, setHover }) {
  const m = MAP_METRICS.find((x) => x.k === metric);
  const vals = STATES.map((s) => s[metric]);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const absMax = Math.max(...vals.map(Math.abs));

  const cell = (s) => {
    const g = GRID[s.code];
    const v = s[metric];
    const bg = m.scale === "div" ? divTint(v / absMax) : tint((v - lo) / (hi - lo || 1));
    const on = selected === s.code;
    const hov = hover === s.code;
    return (
      <button
        key={s.code}
        onClick={() => onSelect(s.code)}
        onMouseEnter={() => setHover(s.code)}
        onMouseLeave={() => setHover(null)}
        onFocus={() => setHover(s.code)}
        onBlur={() => setHover(null)}
        aria-label={`${s.name}, ${m.label} ${m.fmt(v)} ${m.unit}`}
        style={{
          gridRow: g[0] + 1, gridColumn: g[1] + 1, background: bg,
          border: `1.5px solid ${on ? T.amber : hov ? T.text : "rgba(0,0,0,0.45)"}`,
          borderRadius: 2, padding: 0, cursor: "pointer", aspectRatio: "1 / 0.86",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: 1, minWidth: 0,
          boxShadow: on ? `0 0 0 2px rgba(240,162,56,0.28)` : "none",
          transition: "border-color .12s ease",
        }}
      >
        <span style={{
          font: `600 10.5px ${MONO}`, letterSpacing: "0.04em",
          color: "rgba(255,255,255,0.94)", textShadow: "0 1px 2px rgba(0,0,0,0.6)",
        }}>{s.code}</span>
        <span style={{
          font: `400 8.5px ${MONO}`, color: "rgba(255,255,255,0.72)",
          fontVariantNumeric: "tabular-nums", textShadow: "0 1px 2px rgba(0,0,0,0.6)",
        }}>{m.fmt(v)}</span>
      </button>
    );
  };

  return (
    <div>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(12, minmax(0,1fr))",
        gridTemplateRows: "repeat(8, auto)", gap: 3,
      }}>
        {STATES.map(cell)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <span style={{ font: `400 10px ${MONO}`, color: T.faint, letterSpacing: "0.1em" }}>
          {m.scale === "div" ? "NET IMPORTER" : m.fmt(lo)}
        </span>
        <span style={{
          flex: 1, minWidth: 120, height: 8, borderRadius: 1, border: `1px solid ${T.line2}`,
          background: m.scale === "div"
            ? `linear-gradient(90deg, ${divTint(-1)}, ${divTint(0)}, ${divTint(1)})`
            : `linear-gradient(90deg, ${tint(0)}, ${tint(0.25)}, ${tint(0.5)}, ${tint(0.75)}, ${tint(1)})`,
        }} />
        <span style={{ font: `400 10px ${MONO}`, color: T.faint, letterSpacing: "0.1em" }}>
          {m.scale === "div" ? "NET EXPORTER" : m.fmt(hi)}
        </span>
      </div>
    </div>
  );
}

/* ---------- readout strip for the map ------------------------------------ */
function Readout({ code, metric }) {
  const s = code ? BY_CODE[code] : null;
  const m = MAP_METRICS.find((x) => x.k === metric);
  const line = (k, v) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "4px 0", borderBottom: `1px solid ${T.line}` }}>
      <span style={{ font: `400 10.5px ${SANS}`, color: T.faint }}>{k}</span>
      <span style={{ font: `400 11px ${MONO}`, color: T.text, fontVariantNumeric: "tabular-nums" }}>{v}</span>
    </div>
  );
  if (!s) {
    return (
      <div style={{ font: `400 11.5px/1.7 ${SANS}`, color: T.faint }}>
        Point at a tile to read its values. Click to load that state into every panel.
      </div>
    );
  }
  return (
    <div>
      <div style={{ font: `500 15px/1.2 ${SANS}`, color: T.text, marginBottom: 2 }}>{s.name}</div>
      <div style={{ font: `400 10px ${MONO}`, color: T.amber, letterSpacing: "0.12em", marginBottom: 12 }}>
        {s.code} · {REGION_NAMES[s.region].toUpperCase()}
      </div>
      <div style={{
        padding: "8px 10px", background: T.panel2, border: `1px solid ${T.line2}`,
        borderRadius: 2, marginBottom: 12,
      }}>
        <div style={{ font: `400 9.5px ${MONO}`, letterSpacing: "0.12em", color: T.faint, textTransform: "uppercase" }}>{m.label}</div>
        <div style={{ font: `500 22px ${MONO}`, color: T.amber, fontVariantNumeric: "tabular-nums", marginTop: 4 }}>
          {m.fmt(s[metric])} <span style={{ font: `400 10px ${MONO}`, color: T.dim }}>{m.unit}</span>
        </div>
      </div>
      {line("Population", compact(s.pop))}
      {line("Consumption", `${compact(s.cons)} TBtu`)}
      {line("Net generation", `${nf(s.genTotal, 0)} TWh`)}
      {line("Retail sales", `${nf(s.retail, 0)} TWh`)}
      {line("Net position", `${s.net > 0 ? "+" : ""}${nf(s.net, 0)} TWh`)}
      {line("Renewable share", pct(s.renewShare))}
      {line("Residential price", `${nf(s.priceRes, 1)} ¢/kWh`)}
      {line("Energy CO₂", `${nf(s.co2, 0)} Mt`)}
    </div>
  );
}

/* ---------- tabs --------------------------------------------------------- */
const TABS = [
  ["overview", "Overview"],
  ["supply", "Supply"],
  ["demand", "Demand"],
  ["balance", "Balance"],
  ["cost", "Cost & carbon"],
  ["counties", "Counties"],
  ["rankings", "Rankings"],
  ["method", "Method"],
];

/* ======================================================================== */
export default function EnergyConsole() {
  const [scope, setScope] = useState("US");          // "US" or state code
  const [county, setCounty] = useState(null);
  const [tab, setTab] = useState("overview");
  const [metric, setMetric] = useState("cons");
  const [hover, setHover] = useState(null);
  const [compare, setCompare] = useState([]);
  const [sortKey, setSortKey] = useState("cons");
  const [sortDir, setSortDir] = useState(-1);
  const [query, setQuery] = useState("");
  const fileRef = useRef(null);

  const isNat = scope === "US";
  const S = isNat ? NATION : BY_CODE[scope];
  const counties = isNat ? null : countyRows(S);
  const activeCounty = counties && county ? counties.find((c) => c.name === county) : null;
  const V = activeCounty || S; // the unit currently in focus

  const selectState = (code) => {
    setScope(code);
    setCounty(null);
    if (tab === "method") setTab("overview");
  };

  /* --- derived collections --- */
  const genParts = FUELS.map((f) => ({ label: f.label, c: f.c, v: S.gen[f.k], unit: "TWh" }))
    .sort((a, b) => b.v - a.v);
  const useParts = SECTORS.map((x) => ({ label: x.label, c: x.c, v: V.use[x.k], unit: "TBtu" }));

  const ranked = useMemo(() => {
    const rows = STATES.slice().sort((a, b) => (a[sortKey] - b[sortKey]) * sortDir);
    if (!query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));
  }, [sortKey, sortDir, query]);

  const toggleCompare = (code) =>
    setCompare((c) => (c.includes(code) ? c.filter((x) => x !== code) : c.length >= 4 ? c : [...c, code]));

  const exportCsv = () => {
    const head = [
      "code", "state", "region", "population", "consumption_TBtu",
      "residential_TBtu", "commercial_TBtu", "industrial_TBtu", "transportation_TBtu",
      ...FUELS.map((f) => `gen_${f.k}_TWh`),
      "net_generation_TWh", "retail_sales_TWh", "net_position_TWh",
      "renewable_share_pct", "carbonfree_share_pct",
      "price_res_c_kwh", "price_com_c_kwh", "price_ind_c_kwh",
      "co2_Mt", "production_TBtu", "self_sufficiency_pct", "consumption_per_capita_MMBtu",
    ];
    const body = STATES.map((s) => [
      s.code, s.name, s.region, Math.round(s.pop), s.cons,
      s.use.res.toFixed(1), s.use.com.toFixed(1), s.use.ind.toFixed(1), s.use.trans.toFixed(1),
      ...FUELS.map((f) => s.gen[f.k]),
      s.genTotal.toFixed(1), s.retail, s.net.toFixed(1),
      s.renewShare.toFixed(1), s.cleanShare.toFixed(1),
      s.priceRes, s.priceCom, s.priceInd, s.co2, s.prod,
      s.selfSuff.toFixed(1), s.perCapita.toFixed(1),
    ].join(","));
    const csv = [head.join(","), ...body].join("\n");
    try {
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const a = fileRef.current;
      a.href = url; a.download = "us-energy-states.csv"; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      console.error("Download blocked in this frame", e);
    }
  };

  /* --- shared chart tooltip --- */
  const tip = {
    contentStyle: {
      background: T.panel2, border: `1px solid ${T.line2}`, borderRadius: 2,
      font: `400 11px ${MONO}`, color: T.text,
    },
    labelStyle: { color: T.amber, font: `500 11px ${MONO}` },
    itemStyle: { color: T.text },
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: SANS }}>
      <style>{`
        * { box-sizing: border-box; }
        html, body { margin:0; }
        ::-webkit-scrollbar { width:9px; height:9px; }
        ::-webkit-scrollbar-track { background:${T.bg}; }
        ::-webkit-scrollbar-thumb { background:${T.line2}; border-radius:5px; }
        button:focus-visible, select:focus-visible, input:focus-visible, a:focus-visible {
          outline: 2px solid ${T.amber}; outline-offset: 2px;
        }
        button { font-family: inherit; color: inherit; }
        .grid-2 { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:12px; }
        .grid-3 { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:12px; }
        .grid-4 { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:12px; }
        .split { display:grid; grid-template-columns: minmax(0,1.65fr) minmax(0,1fr); gap:12px; }
        .wide { display:grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap:12px; }
        @media (max-width: 1080px) {
          .grid-4 { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .grid-3 { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .split, .wide { grid-template-columns: minmax(0,1fr); }
        }
        @media (max-width: 620px) {
          .grid-4, .grid-3, .grid-2 { grid-template-columns: minmax(0,1fr); }
        }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
        table { border-collapse: collapse; width: 100%; }
        th, td { text-align: right; padding: 6px 9px; white-space: nowrap; }
        th:first-child, td:first-child { text-align: left; }
      `}</style>
      <a ref={fileRef} style={{ display: "none" }} href="#dl">download</a>

      {/* ---- masthead ---- */}
      <header style={{
        borderBottom: `1px solid ${T.line}`, background: T.panel,
        position: "sticky", top: 0, zIndex: 20,
      }}>
        <div style={{
          maxWidth: 1500, margin: "0 auto", padding: "12px 18px",
          display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 20 }}>
              {[7, 13, 20, 11, 16].map((h, i) => (
                <span key={i} style={{ width: 3, height: h, background: i === 2 ? T.amber : T.line2 }} />
              ))}
            </div>
            <div>
              <div style={{
                font: `600 13px/1 ${MONO}`, letterSpacing: "0.2em", textTransform: "uppercase",
              }}>US Energy Console</div>
              <div style={{ font: `400 10px/1.4 ${MONO}`, color: T.faint, letterSpacing: "0.08em", marginTop: 3 }}>
                SUPPLY · DEMAND · CONSUMPTION
              </div>
            </div>
          </div>

          {/* scope selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
            <span style={{ font: `400 9.5px ${MONO}`, letterSpacing: "0.15em", color: T.faint }}>SCOPE</span>
            <select
              value={scope}
              onChange={(e) => selectState(e.target.value)}
              style={{
                background: T.panel2, color: T.text, border: `1px solid ${T.line2}`,
                borderRadius: 2, padding: "6px 9px", font: `400 12px ${MONO}`, minWidth: 190,
              }}
            >
              <option value="US">United States — all states</option>
              {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
            <select
              value={county || ""}
              disabled={isNat}
              onChange={(e) => setCounty(e.target.value || null)}
              style={{
                background: isNat ? T.bg : T.panel2, color: isNat ? T.faint : T.text,
                border: `1px solid ${T.line2}`, borderRadius: 2, padding: "6px 9px",
                font: `400 12px ${MONO}`, minWidth: 190, opacity: isNat ? 0.5 : 1,
              }}
            >
              <option value="">{isNat ? "Pick a state first" : "All counties"}</option>
              {counties && counties.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            {(!isNat || county) && (
              <button
                onClick={() => { setScope("US"); setCounty(null); }}
                style={{
                  background: "transparent", border: `1px solid ${T.line2}`, borderRadius: 2,
                  padding: "6px 10px", font: `400 11px ${MONO}`, color: T.dim, cursor: "pointer",
                }}
              >Reset</button>
            )}
          </div>
        </div>

        {/* tabs */}
        <nav style={{ maxWidth: 1500, margin: "0 auto", padding: "0 12px", display: "flex", gap: 0, overflowX: "auto" }}>
          {TABS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                padding: "9px 13px", font: `500 11px ${MONO}`, letterSpacing: "0.12em",
                textTransform: "uppercase", color: tab === k ? T.amber : T.faint,
                borderBottom: `2px solid ${tab === k ? T.amber : "transparent"}`,
                whiteSpace: "nowrap",
              }}
            >{label}</button>
          ))}
        </nav>
      </header>

      <main style={{ maxWidth: 1500, margin: "0 auto", padding: "16px 18px 48px" }}>
        {/* ---- scope breadcrumb ---- */}
        <div style={{
          display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14, flexWrap: "wrap",
        }}>
          <h1 style={{
            margin: 0, font: `500 27px/1.1 ${SANS}`, letterSpacing: "-0.015em",
          }}>
            {activeCounty ? `${activeCounty.name}` : S.name}
          </h1>
          <span style={{ font: `400 11px ${MONO}`, color: T.faint, letterSpacing: "0.1em" }}>
            {activeCounty
              ? `${S.name.toUpperCase()} · MODELLED COUNTY ESTIMATE`
              : isNat ? "51 REPORTING AREAS · ROLLED UP FROM STATE ROWS"
                : `${REGION_NAMES[S.region].toUpperCase()} · ${(COUNTIES[S.code] || []).length} COUNTIES LISTED`}
          </span>
        </div>

        {/* ================= OVERVIEW ================= */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="grid-4">
              <Metric label="Total energy consumed" value={compact(V.cons)} unit="trillion Btu"
                sub={activeCounty ? `${pct(activeCounty.share)} of ${S.name}` : `${nf(V.perCapita, 0)} MMBtu per person`} />
              <Metric label="Electricity demand" value={nf(V.retail, V.retail < 100 ? 1 : 0)} unit="TWh retail sales"
                tone={T.cyan}
                sub={`${compact((V.retail * 1e9) / V.pop)} kWh per person`} />
              {!activeCounty ? (
                <Metric label="Electricity supplied" value={nf(S.genTotal, S.genTotal < 100 ? 1 : 0)} unit="TWh net generation"
                  tone={T.amber}
                  sub={`${pct(S.renewShare, 0)} renewable · ${pct(S.cleanShare, 0)} carbon-free`} />
              ) : (
                <Metric label="Population" value={compact(activeCounty.pop)} unit="residents"
                  sub={`${pct((activeCounty.pop / S.pop) * 100)} of state population`} />
              )}
              {!activeCounty ? (
                <Metric
                  label="Net position"
                  value={`${S.net > 0 ? "+" : ""}${nf(S.net, 0)}`}
                  unit="TWh"
                  tone={S.net >= 0 ? T.green : T.red}
                  sub={S.net >= 0
                    ? "Generates more than it sells at retail — net exporter to neighbours"
                    : "Sells more than it generates — leans on imported power"}
                />
              ) : (
                <Metric label="Energy CO₂" value={nf(activeCounty.co2, 1)} unit="million t"
                  tone={T.red} sub="Apportioned from state total" />
              )}
            </div>

            <div className="split">
              <Panel
                title="State grid"
                tag="click a tile to change scope"
                right={
                  <select
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                    style={{
                      background: T.panel2, color: T.text, border: `1px solid ${T.line2}`,
                      borderRadius: 2, padding: "4px 8px", font: `400 11px ${MONO}`,
                    }}
                  >
                    {MAP_METRICS.map((m) => <option key={m.k} value={m.k}>{m.label}</option>)}
                  </select>
                }
              >
                <Cartogram
                  metric={metric}
                  selected={isNat ? null : S.code}
                  onSelect={selectState}
                  hover={hover}
                  setHover={setHover}
                />
              </Panel>

              <Panel title="Readout" tag={hover || (isNat ? "national" : S.code)}>
                <Readout code={hover || (isNat ? null : S.code)} metric={metric} />
              </Panel>
            </div>

            <div className="wide">
              <Panel title="Where the electricity comes from" tag={`${nf(S.genTotal, 0)} TWh`}>
                <Eyebrow>Generation stack by fuel</Eyebrow>
                <StackBar parts={genParts} height={30} />
                <Legend items={genParts.filter((p) => p.v > 0)} />
              </Panel>

              <Panel title="Where the energy goes" tag={`${compact(V.cons)} TBtu`}>
                <Eyebrow>All fuels, end-use sector</Eyebrow>
                <StackBar parts={useParts} height={30} />
                <Legend items={useParts} />
              </Panel>
            </div>

            <Panel title="National generation mix over time" tag="TWh · all states">
              <div style={{ height: 260 }}>
                <ResponsiveContainer>
                  <AreaChart data={TREND} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={T.line} vertical={false} />
                    <XAxis dataKey="y" stroke={T.faint} tick={{ fill: T.faint, fontSize: 11, fontFamily: MONO }} />
                    <YAxis stroke={T.faint} tick={{ fill: T.faint, fontSize: 11, fontFamily: MONO }} width={48} />
                    <Tooltip {...tip} />
                    {[
                      ["coal", "Coal"], ["gas", "Natural gas"], ["nuc", "Nuclear"],
                      ["hyd", "Hydro"], ["wind", "Wind"], ["sol", "Solar"], ["oth", "Other"],
                    ].map(([k, label]) => {
                      const c = FUELS.find((f) => f.k === k)?.c || T.faint;
                      return (
                        <Area key={k} type="monotone" dataKey={k} name={label} stackId="1"
                          stroke={c} fill={c} fillOpacity={0.62} strokeWidth={1} />
                      );
                    })}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p style={{ font: `400 11.5px/1.6 ${SANS}`, color: T.faint, margin: "10px 0 0" }}>
                Gas overtook coal in 2016 and has not given the lead back. Solar and wind together now
                out-generate coal nationally, while nuclear output has stayed nearly flat for a decade.
                The 2025 row is a partial-year estimate.
              </p>
            </Panel>
          </div>
        )}

        {/* ================= SUPPLY ================= */}
        {tab === "supply" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="grid-4">
              <Metric label="Net generation" value={nf(S.genTotal, S.genTotal < 100 ? 1 : 0)} unit="TWh" tone={T.amber} />
              <Metric label="Renewable output" value={nf(S.renewGen, 1)} unit="TWh" tone={T.cyan}
                sub={`${pct(S.renewShare)} of generation`} />
              <Metric label="Carbon-free output" value={nf(S.cleanGen, 1)} unit="TWh" tone={T.violet}
                sub={`${pct(S.cleanShare)} including nuclear`} />
              <Metric label="Primary energy produced" value={compact(S.prod)} unit="trillion Btu"
                sub={`${pct(S.selfSuff, 0)} of what the ${isNat ? "country" : "state"} consumes`} />
            </div>

            <div className="wide">
              <Panel title="Generation stack" tag="TWh by fuel">
                <StackBar parts={genParts} height={34} />
                <Legend items={genParts.filter((p) => p.v > 0)} cols={2} />
              </Panel>
              <Panel title="Fuel detail">
                <table>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.line2}` }}>
                      {["Fuel", "TWh", "Share", "Rank in US"].map((h) => (
                        <th key={h} style={{ font: `500 9.5px ${MONO}`, letterSpacing: "0.12em", color: T.faint, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {FUELS.map((f) => {
                      const v = S.gen[f.k];
                      const rank = isNat ? null :
                        STATES.slice().sort((a, b) => b.gen[f.k] - a.gen[f.k]).findIndex((x) => x.code === S.code) + 1;
                      return (
                        <tr key={f.k} style={{ borderBottom: `1px solid ${T.line}` }}>
                          <td style={{ font: `400 12px ${SANS}` }}>
                            <span style={{ display: "inline-block", width: 8, height: 8, background: f.c, marginRight: 8, borderRadius: 1 }} />
                            {f.label}
                          </td>
                          <td style={{ font: `400 12px ${MONO}`, fontVariantNumeric: "tabular-nums" }}>{nf(v, v < 10 ? 1 : 0)}</td>
                          <td style={{ font: `400 12px ${MONO}`, color: T.dim }}>{S.genTotal ? pct((v / S.genTotal) * 100) : "—"}</td>
                          <td style={{ font: `400 12px ${MONO}`, color: T.faint }}>{rank ? `#${rank}` : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Panel>
            </div>

            <Panel title="Who supplies each fuel" tag="top ten states, TWh">
              <div className="grid-3" style={{ gap: 16 }}>
                {["gas", "coal", "nuc", "wind", "sol", "hyd"].map((k) => {
                  const f = FUELS.find((x) => x.k === k);
                  const rows = STATES.slice().sort((a, b) => b.gen[k] - a.gen[k]).slice(0, 10)
                    .map((s) => ({ ...s, v: s.gen[k] }));
                  return (
                    <div key={k}>
                      <Eyebrow>{f.label}</Eyebrow>
                      <RankBars
                        rows={rows} valueKey="v" color={f.c}
                        format={(v) => nf(v, v < 10 ? 1 : 0)}
                        onPick={(r) => selectState(r.code)}
                        active={isNat ? null : S.code}
                      />
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Production against consumption" tag="energy self-sufficiency">
              <div style={{ height: 300 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={STATES.slice().sort((a, b) => b.selfSuff - a.selfSuff).slice(0, 22)}
                    margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid stroke={T.line} vertical={false} />
                    <XAxis dataKey="code" stroke={T.faint} tick={{ fill: T.faint, fontSize: 10, fontFamily: MONO }} interval={0} />
                    <YAxis stroke={T.faint} tick={{ fill: T.faint, fontSize: 11, fontFamily: MONO }} width={44}
                      tickFormatter={(v) => `${v}%`} />
                    <Tooltip {...tip} formatter={(v) => [`${nf(v, 0)}%`, "Production ÷ consumption"]} />
                    <Bar dataKey="selfSuff" radius={[1, 1, 0, 0]}>
                      {STATES.slice().sort((a, b) => b.selfSuff - a.selfSuff).slice(0, 22).map((s) => (
                        <Cell key={s.code} fill={s.code === S.code ? T.amber : "#2E5A63"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p style={{ font: `400 11.5px/1.6 ${SANS}`, color: T.faint, margin: "10px 0 0" }}>
                Above 100% means the state produces more raw energy — coal, gas, oil, uranium, renewables —
                than it burns. Wyoming, North Dakota, Texas and Pennsylvania carry the rest of the country.
              </p>
            </Panel>
          </div>
        )}

        {/* ================= DEMAND ================= */}
        {tab === "demand" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="grid-4">
              {SECTORS.map((x) => (
                <Metric
                  key={x.k}
                  label={x.label}
                  value={compact(V.use[x.k])}
                  unit="trillion Btu"
                  tone={x.c}
                  sub={`${pct((V.use[x.k] / V.cons) * 100)} of total demand`}
                />
              ))}
            </div>

            <div className="wide">
              <Panel title="Demand by sector" tag={activeCounty ? "county estimate" : "reported"}>
                <StackBar parts={useParts} height={34} />
                <Legend items={useParts} cols={2} />
                <p style={{ font: `400 11.5px/1.6 ${SANS}`, color: T.faint, margin: "14px 0 0" }}>
                  {S.use.ind / S.cons > 0.45
                    ? "Industry dominates this profile — refineries, chemicals, metals and mining move the total far more than household behaviour does."
                    : S.use.trans / S.cons > 0.42
                      ? "Transportation is the largest single block here, so the demand curve tracks fuel prices and travel more than weather."
                      : "Demand is spread fairly evenly across the four sectors, which usually means a mixed service-and-manufacturing economy."}
                </p>
              </Panel>

              <Panel title="Per-person intensity" tag="MMBtu per resident">
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <Eyebrow>{activeCounty ? activeCounty.name : S.name}</Eyebrow>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ font: `500 34px ${MONO}`, color: T.amber, fontVariantNumeric: "tabular-nums" }}>
                        {nf(V.perCapita, 0)}
                      </span>
                      <span style={{ font: `400 12px ${MONO}`, color: T.dim }}>MMBtu / person / year</span>
                    </div>
                    <div style={{ font: `400 11.5px/1.6 ${SANS}`, color: T.faint, marginTop: 6 }}>
                      National average is {nf(NATION.perCapita, 0)}. This unit is
                      {" "}{V.perCapita > NATION.perCapita ? "above" : "below"} it by
                      {" "}{pct(Math.abs((V.perCapita / NATION.perCapita - 1) * 100), 0)}.
                    </div>
                  </div>
                  <div>
                    <Eyebrow>Highest intensity states</Eyebrow>
                    <RankBars
                      rows={STATES.slice().sort((a, b) => b.perCapita - a.perCapita).slice(0, 10)}
                      valueKey="perCapita" color={T.amber} format={(v) => nf(v, 0)}
                      onPick={(r) => selectState(r.code)} active={isNat ? null : S.code}
                    />
                  </div>
                </div>
              </Panel>
            </div>

            <Panel title="Sector mix across every state" tag="share of total consumption">
              <div style={{ height: 320 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={STATES.slice().sort((a, b) => b.cons - a.cons).map((s) => ({
                      code: s.code,
                      res: (s.use.res / s.cons) * 100, com: (s.use.com / s.cons) * 100,
                      ind: (s.use.ind / s.cons) * 100, trans: (s.use.trans / s.cons) * 100,
                    }))}
                    margin={{ top: 8, right: 10, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid stroke={T.line} vertical={false} />
                    <XAxis dataKey="code" stroke={T.faint} tick={{ fill: T.faint, fontSize: 9, fontFamily: MONO }} interval={0} />
                    <YAxis stroke={T.faint} tick={{ fill: T.faint, fontSize: 11, fontFamily: MONO }} width={40} tickFormatter={(v) => `${v}%`} />
                    <Tooltip {...tip} formatter={(v, n) => [`${nf(v, 1)}%`, n]} />
                    {SECTORS.map((x) => (
                      <Bar key={x.k} dataKey={x.k} name={x.label} stackId="a" fill={x.c} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Legend items={SECTORS.map((x) => ({ label: x.label, c: x.c, v: NATION.use[x.k] }))} cols={4} />
            </Panel>

            <Panel title="Largest electricity markets" tag="retail sales, TWh">
              <RankBars
                rows={STATES.slice().sort((a, b) => b.retail - a.retail).slice(0, 20)}
                valueKey="retail" color={T.cyan} format={(v) => nf(v, 0)}
                onPick={(r) => selectState(r.code)} active={isNat ? null : S.code}
              />
            </Panel>
          </div>
        )}

        {/* ================= BALANCE ================= */}
        {tab === "balance" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="grid-4">
              <Metric label="Net generation" value={nf(S.genTotal, 0)} unit="TWh" tone={T.amber} />
              <Metric label="Retail sales" value={nf(S.retail, 0)} unit="TWh" tone={T.cyan} />
              <Metric label="Net position" value={`${S.net > 0 ? "+" : ""}${nf(S.net, 0)}`} unit="TWh"
                tone={S.net >= 0 ? T.green : T.red}
                sub={`${pct(Math.abs((S.net / S.retail) * 100), 0)} of local sales`} />
              <Metric label="Coverage ratio" value={pct((S.genTotal / S.retail) * 100, 0)} unit="gen ÷ sales"
                sub={S.genTotal >= S.retail ? "Self-covering on an annual basis" : "Depends on imports across the year"} />
            </div>

            <Panel title="Generation against retail sales" tag={isNat ? "all states" : S.name}>
              <div style={{ height: 340 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={STATES.slice().sort((a, b) => b.net - a.net)}
                    margin={{ top: 8, right: 10, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid stroke={T.line} vertical={false} />
                    <XAxis dataKey="code" stroke={T.faint} tick={{ fill: T.faint, fontSize: 9, fontFamily: MONO }} interval={0} />
                    <YAxis stroke={T.faint} tick={{ fill: T.faint, fontSize: 11, fontFamily: MONO }} width={48} />
                    <Tooltip {...tip} formatter={(v) => [`${nf(v, 1)} TWh`, "Net position"]} />
                    <Bar dataKey="net" radius={[1, 1, 0, 0]}>
                      {STATES.slice().sort((a, b) => b.net - a.net).map((s) => (
                        <Cell key={s.code} fill={s.code === S.code ? T.amber : s.net >= 0 ? "#2E7D5B" : "#8E3B44"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p style={{ font: `400 11.5px/1.6 ${SANS}`, color: T.faint, margin: "10px 0 0" }}>
                Bars above the line are states that generate more than their own retail customers buy; the
                surplus moves to neighbours over interties. Below the line, the state buys in. Annual
                balances hide the hours that actually matter — a state can be a net exporter for the year
                and still import heavily on a still, cloudy winter evening.
              </p>
            </Panel>

            <div className="wide">
              <Panel title="Largest surpluses" tag="TWh above local sales">
                <RankBars
                  rows={STATES.slice().sort((a, b) => b.net - a.net).slice(0, 12)}
                  valueKey="net" color={T.green} format={(v) => `+${nf(v, 0)}`}
                  onPick={(r) => selectState(r.code)} active={isNat ? null : S.code}
                />
              </Panel>
              <Panel title="Largest shortfalls" tag="TWh below local sales">
                <RankBars
                  rows={STATES.slice().sort((a, b) => a.net - b.net).slice(0, 12).map((s) => ({ ...s, gap: -s.net }))}
                  valueKey="gap" color={T.red} format={(v) => `−${nf(v, 0)}`}
                  onPick={(r) => selectState(r.code)} active={isNat ? null : S.code}
                />
              </Panel>
            </div>
          </div>
        )}

        {/* ================= COST & CARBON ================= */}
        {tab === "cost" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="grid-4">
              <Metric label="Residential price" value={nf(S.priceRes, 1)} unit="¢/kWh" tone={T.amber} />
              <Metric label="Commercial price" value={nf(S.priceCom, 1)} unit="¢/kWh" tone={T.violet} />
              <Metric label="Industrial price" value={nf(S.priceInd, 1)} unit="¢/kWh" tone={T.cyan} />
              <Metric label="Energy CO₂" value={compact(S.co2)} unit="million t" tone={T.red}
                sub={`${nf(S.co2Intensity, 1)} kg per million Btu consumed`} />
            </div>

            <Panel title="Residential electricity price" tag="cents per kWh">
              <div style={{ height: 300 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={STATES.slice().sort((a, b) => b.priceRes - a.priceRes)}
                    margin={{ top: 8, right: 10, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid stroke={T.line} vertical={false} />
                    <XAxis dataKey="code" stroke={T.faint} tick={{ fill: T.faint, fontSize: 9, fontFamily: MONO }} interval={0} />
                    <YAxis stroke={T.faint} tick={{ fill: T.faint, fontSize: 11, fontFamily: MONO }} width={40} />
                    <Tooltip {...tip} formatter={(v) => [`${nf(v, 1)} ¢/kWh`, "Residential"]} />
                    <Bar dataKey="priceRes" radius={[1, 1, 0, 0]}>
                      {STATES.slice().sort((a, b) => b.priceRes - a.priceRes).map((s) => (
                        <Cell key={s.code} fill={s.code === S.code ? T.amber : "#3A5F6B"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <div className="wide">
              <Panel title="Price spread by customer class" tag={S.name}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[["Residential", S.priceRes, T.amber], ["Commercial", S.priceCom, T.violet], ["Industrial", S.priceInd, T.cyan]].map(([label, v, c]) => (
                    <div key={label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ font: `400 11.5px ${SANS}`, color: T.dim }}>{label}</span>
                        <span style={{ font: `400 12px ${MONO}`, color: T.text }}>{nf(v, 1)} ¢/kWh</span>
                      </div>
                      <div style={{ height: 10, background: T.bg, border: `1px solid ${T.line}`, borderRadius: 1 }}>
                        <div style={{ height: "100%", width: `${(v / 45) * 100}%`, background: c }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p style={{ font: `400 11.5px/1.6 ${SANS}`, color: T.faint, margin: "16px 0 0" }}>
                  Industrial customers take power at higher voltage and flatter load, so they pay
                  {" "}{pct(((S.priceRes - S.priceInd) / S.priceRes) * 100, 0)} less per kWh than households here.
                </p>
              </Panel>

              <Panel title="Carbon intensity of energy use" tag="kg CO₂ per million Btu">
                <RankBars
                  rows={STATES.slice().sort((a, b) => b.co2Intensity - a.co2Intensity).slice(0, 14)}
                  valueKey="co2Intensity" color={T.red} format={(v) => nf(v, 1)}
                  onPick={(r) => selectState(r.code)} active={isNat ? null : S.code}
                />
              </Panel>
            </div>

            <Panel title="Cleaner grids, cheaper power?" tag="carbon-free share vs residential price">
              <div style={{ height: 300 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={STATES.slice().sort((a, b) => b.cleanShare - a.cleanShare)}
                    margin={{ top: 8, right: 10, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid stroke={T.line} vertical={false} />
                    <XAxis dataKey="code" stroke={T.faint} tick={{ fill: T.faint, fontSize: 9, fontFamily: MONO }} interval={0} />
                    <YAxis stroke={T.faint} tick={{ fill: T.faint, fontSize: 11, fontFamily: MONO }} width={40} tickFormatter={(v) => `${v}%`} />
                    <Tooltip {...tip} formatter={(v, n) => [n === "cleanShare" ? `${nf(v, 1)}%` : nf(v, 1), n === "cleanShare" ? "Carbon-free share" : "¢/kWh"]} />
                    <Bar dataKey="cleanShare" name="cleanShare" fill="#3C7F8C" radius={[1, 1, 0, 0]} />
                    <Bar dataKey="priceRes" name="priceRes" fill={T.amber} radius={[1, 1, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p style={{ font: `400 11.5px/1.6 ${SANS}`, color: T.faint, margin: "10px 0 0" }}>
                There is no clean line between the two. Vermont, Washington and South Carolina all run
                low-carbon grids at very different prices, because price is driven at least as much by
                network costs, fuel contracts and state policy as by the mix itself.
              </p>
            </Panel>
          </div>
        )}

        {/* ================= COUNTIES ================= */}
        {tab === "counties" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {isNat ? (
              <Panel title="County view" pad={0}>
                <div style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ font: `400 13px/1.7 ${SANS}`, color: T.dim, maxWidth: 460, margin: "0 auto 20px" }}>
                    County figures are built from a state's totals, so pick a state to open them.
                  </div>
                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(76px,1fr))",
                    gap: 5, maxWidth: 700, margin: "0 auto",
                  }}>
                    {STATES.map((s) => (
                      <button
                        key={s.code}
                        onClick={() => selectState(s.code)}
                        style={{
                          background: T.panel2, border: `1px solid ${T.line2}`, borderRadius: 2,
                          padding: "7px 4px", font: `400 11px ${MONO}`, color: T.text, cursor: "pointer",
                        }}
                      >{s.code}</button>
                    ))}
                  </div>
                </div>
              </Panel>
            ) : (
              <>
                <div style={{
                  border: `1px solid ${T.line2}`, background: T.panel2, borderRadius: 3,
                  padding: "11px 14px", display: "flex", gap: 11, alignItems: "flex-start",
                }}>
                  <span style={{ color: T.amber, font: `600 12px ${MONO}`, flexShrink: 0, marginTop: 1 }}>MODEL</span>
                  <p style={{ margin: 0, font: `400 11.5px/1.6 ${SANS}`, color: T.dim }}>
                    These county numbers are estimates, not measurements. Official energy statistics stop at
                    the state line for most series, so each county's share is derived from its population,
                    with commercial demand tilted toward the larger, more built-up counties. Use them to
                    compare counties against each other, not as reported values. The full method is on the
                    Method tab.
                  </p>
                </div>

                <div className="grid-4">
                  <Metric label="Counties covered" value={String(counties.length)} unit="rows"
                    sub={`${(COUNTIES[S.code] || []).length} named${counties.some((c) => c.rest) ? " + balance of state" : ""}`} />
                  <Metric label="Largest by demand" value={counties[0].name.length > 12 ? counties[0].name.slice(0, 12) + "…" : counties[0].name}
                    tone={T.amber} sub={`${compact(counties[0].cons)} TBtu · ${pct(counties[0].share)} of state`} />
                  <Metric label="Top five concentration"
                    value={pct(counties.slice(0, 5).reduce((a, c) => a + c.share, 0), 0)}
                    tone={T.cyan} sub="Share of state demand in the five biggest counties" />
                  <Metric label="Intensity spread"
                    value={`${nf(Math.min(...counties.map((c) => c.perCapita)), 0)}–${nf(Math.max(...counties.map((c) => c.perCapita)), 0)}`}
                    unit="MMBtu/person" sub="Narrow by construction — the model scales with population" />
                </div>

                <Panel title={`Counties of ${S.name}`} tag="estimated total energy demand">
                  <RankBars
                    rows={counties.map((c) => ({ ...c, code: c.name }))}
                    valueKey="cons" color={T.amber}
                    format={(v) => `${compact(v)} TBtu`}
                    onPick={(r) => setCounty(r.name)}
                    active={county}
                  />
                </Panel>

                <Panel title="County detail" tag="estimated" pad={0}>
                  <div style={{ overflowX: "auto" }}>
                    <table>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${T.line2}`, background: "rgba(255,255,255,0.015)" }}>
                          {["County", "Population", "Total TBtu", "% of state", "Residential", "Commercial", "Industrial", "Transport", "Electricity TWh", "MMBtu/person"].map((h) => (
                            <th key={h} style={{
                              font: `500 9.5px ${MONO}`, letterSpacing: "0.1em", color: T.faint,
                              textTransform: "uppercase", padding: "9px 10px",
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {counties.map((c) => (
                          <tr
                            key={c.name}
                            onClick={() => setCounty(c.name)}
                            style={{
                              borderBottom: `1px solid ${T.line}`, cursor: "pointer",
                              background: county === c.name ? T.panel2 : "transparent",
                            }}
                          >
                            <td style={{ font: `400 12px ${SANS}`, color: c.rest ? T.faint : T.text, fontStyle: c.rest ? "italic" : "normal" }}>{c.name}</td>
                            <td style={{ font: `400 11.5px ${MONO}`, color: T.dim }}>{compact(c.pop)}</td>
                            <td style={{ font: `400 11.5px ${MONO}`, color: T.amber }}>{nf(c.cons, 1)}</td>
                            <td style={{ font: `400 11.5px ${MONO}`, color: T.dim }}>{pct(c.share)}</td>
                            <td style={{ font: `400 11.5px ${MONO}` }}>{nf(c.use.res, 1)}</td>
                            <td style={{ font: `400 11.5px ${MONO}` }}>{nf(c.use.com, 1)}</td>
                            <td style={{ font: `400 11.5px ${MONO}` }}>{nf(c.use.ind, 1)}</td>
                            <td style={{ font: `400 11.5px ${MONO}` }}>{nf(c.use.trans, 1)}</td>
                            <td style={{ font: `400 11.5px ${MONO}`, color: T.cyan }}>{nf(c.retail, 2)}</td>
                            <td style={{ font: `400 11.5px ${MONO}`, color: T.dim }}>{nf(c.perCapita, 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              </>
            )}
          </div>
        )}

        {/* ================= RANKINGS ================= */}
        {tab === "rankings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Panel
              title="Every state, every measure"
              tag={`${ranked.length} rows`}
              pad={0}
              right={
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter states"
                    style={{
                      background: T.bg, border: `1px solid ${T.line2}`, borderRadius: 2,
                      padding: "5px 9px", font: `400 11px ${MONO}`, color: T.text, width: 130,
                    }}
                  />
                  <button
                    onClick={exportCsv}
                    style={{
                      background: T.panel2, border: `1px solid ${T.line2}`, borderRadius: 2,
                      padding: "5px 10px", font: `500 10.5px ${MONO}`, letterSpacing: "0.1em",
                      color: T.amber, cursor: "pointer", textTransform: "uppercase",
                    }}
                  >Download CSV</button>
                </div>
              }
            >
              <div style={{ overflowX: "auto", maxHeight: 640 }}>
                <table>
                  <thead style={{ position: "sticky", top: 0, background: T.panel, zIndex: 2 }}>
                    <tr style={{ borderBottom: `1px solid ${T.line2}` }}>
                      {[
                        ["name", "State"], ["pop", "Population"], ["cons", "Consumption TBtu"],
                        ["perCapita", "MMBtu/person"], ["genTotal", "Generation TWh"],
                        ["retail", "Retail TWh"], ["net", "Net TWh"],
                        ["renewShare", "Renewable %"], ["cleanShare", "Carbon-free %"],
                        ["priceRes", "Res ¢/kWh"], ["priceInd", "Ind ¢/kWh"],
                        ["co2", "CO₂ Mt"], ["selfSuff", "Self-suff %"],
                      ].map(([k, label]) => (
                        <th
                          key={k}
                          onClick={() => { setSortKey(k); setSortDir(sortKey === k ? -sortDir : -1); }}
                          style={{
                            font: `500 9.5px ${MONO}`, letterSpacing: "0.08em",
                            color: sortKey === k ? T.amber : T.faint, textTransform: "uppercase",
                            cursor: "pointer", padding: "10px 9px", userSelect: "none",
                          }}
                        >
                          {label}{sortKey === k ? (sortDir === -1 ? " ▾" : " ▴") : ""}
                        </th>
                      ))}
                      <th style={{ font: `500 9.5px ${MONO}`, color: T.faint, padding: "10px 9px" }}>PIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((s) => (
                      <tr
                        key={s.code}
                        style={{
                          borderBottom: `1px solid ${T.line}`,
                          background: s.code === scope ? T.panel2 : compare.includes(s.code) ? "rgba(240,162,56,0.06)" : "transparent",
                        }}
                      >
                        <td onClick={() => selectState(s.code)} style={{ font: `400 12px ${SANS}`, cursor: "pointer" }}>
                          <span style={{ color: T.faint, font: `400 10.5px ${MONO}`, marginRight: 7 }}>{s.code}</span>
                          {s.name}
                        </td>
                        <td style={{ font: `400 11.5px ${MONO}`, color: T.dim }}>{compact(s.pop)}</td>
                        <td style={{ font: `400 11.5px ${MONO}`, color: T.amber }}>{nf(s.cons, 0)}</td>
                        <td style={{ font: `400 11.5px ${MONO}` }}>{nf(s.perCapita, 0)}</td>
                        <td style={{ font: `400 11.5px ${MONO}` }}>{nf(s.genTotal, 0)}</td>
                        <td style={{ font: `400 11.5px ${MONO}`, color: T.cyan }}>{nf(s.retail, 0)}</td>
                        <td style={{ font: `400 11.5px ${MONO}`, color: s.net >= 0 ? T.green : T.red }}>
                          {s.net > 0 ? "+" : ""}{nf(s.net, 0)}
                        </td>
                        <td style={{ font: `400 11.5px ${MONO}` }}>{nf(s.renewShare, 1)}</td>
                        <td style={{ font: `400 11.5px ${MONO}` }}>{nf(s.cleanShare, 1)}</td>
                        <td style={{ font: `400 11.5px ${MONO}` }}>{nf(s.priceRes, 1)}</td>
                        <td style={{ font: `400 11.5px ${MONO}`, color: T.dim }}>{nf(s.priceInd, 1)}</td>
                        <td style={{ font: `400 11.5px ${MONO}` }}>{nf(s.co2, 0)}</td>
                        <td style={{ font: `400 11.5px ${MONO}`, color: T.dim }}>{nf(s.selfSuff, 0)}</td>
                        <td>
                          <button
                            onClick={() => toggleCompare(s.code)}
                            style={{
                              background: compare.includes(s.code) ? T.amber : "transparent",
                              color: compare.includes(s.code) ? "#0A1116" : T.faint,
                              border: `1px solid ${compare.includes(s.code) ? T.amber : T.line2}`,
                              borderRadius: 2, padding: "1px 7px", font: `500 10px ${MONO}`, cursor: "pointer",
                            }}
                          >{compare.includes(s.code) ? "ON" : "+"}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            {compare.length > 0 && (
              <Panel
                title="Side by side"
                tag={`${compare.length} pinned`}
                right={
                  <button onClick={() => setCompare([])} style={{
                    background: "transparent", border: `1px solid ${T.line2}`, borderRadius: 2,
                    padding: "4px 9px", font: `400 10.5px ${MONO}`, color: T.dim, cursor: "pointer",
                  }}>Clear</button>
                }
              >
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${T.line2}` }}>
                        <th style={{ font: `500 9.5px ${MONO}`, color: T.faint, letterSpacing: "0.1em" }}>MEASURE</th>
                        {compare.map((c) => (
                          <th key={c} style={{ font: `500 11px ${MONO}`, color: T.amber }}>{BY_CODE[c].name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Population", (s) => compact(s.pop)],
                        ["Total consumption (TBtu)", (s) => nf(s.cons, 0)],
                        ["Per person (MMBtu)", (s) => nf(s.perCapita, 0)],
                        ["Residential share", (s) => pct((s.use.res / s.cons) * 100)],
                        ["Industrial share", (s) => pct((s.use.ind / s.cons) * 100)],
                        ["Transport share", (s) => pct((s.use.trans / s.cons) * 100)],
                        ["Net generation (TWh)", (s) => nf(s.genTotal, 0)],
                        ["Retail sales (TWh)", (s) => nf(s.retail, 0)],
                        ["Net position (TWh)", (s) => `${s.net > 0 ? "+" : ""}${nf(s.net, 0)}`],
                        ["Leading fuel", (s) => FUELS.slice().sort((a, b) => s.gen[b.k] - s.gen[a.k])[0].label],
                        ["Renewable share", (s) => pct(s.renewShare)],
                        ["Carbon-free share", (s) => pct(s.cleanShare)],
                        ["Residential ¢/kWh", (s) => nf(s.priceRes, 1)],
                        ["Industrial ¢/kWh", (s) => nf(s.priceInd, 1)],
                        ["Energy CO₂ (Mt)", (s) => nf(s.co2, 0)],
                        ["CO₂ per MMBtu (kg)", (s) => nf(s.co2Intensity, 1)],
                        ["Self-sufficiency", (s) => pct(s.selfSuff, 0)],
                      ].map(([label, fn]) => (
                        <tr key={label} style={{ borderBottom: `1px solid ${T.line}` }}>
                          <td style={{ font: `400 11.5px ${SANS}`, color: T.dim }}>{label}</td>
                          {compare.map((c) => (
                            <td key={c} style={{ font: `400 12px ${MONO}`, color: T.text, fontVariantNumeric: "tabular-nums" }}>
                              {fn(BY_CODE[c])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}
          </div>
        )}

        {/* ================= METHOD ================= */}
        {tab === "method" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{
              border: `1px solid ${T.amber}`, background: "rgba(240,162,56,0.07)",
              borderRadius: 3, padding: "14px 16px",
            }}>
              <div style={{ font: `600 10.5px ${MONO}`, letterSpacing: "0.16em", color: T.amber, marginBottom: 8 }}>
                READ THIS FIRST
              </div>
              <p style={{ margin: 0, font: `400 13px/1.7 ${SANS}`, color: T.text }}>
                This console runs on an embedded reference dataset, not a live feed. The state figures are
                rounded values in the shape of the published EIA series and are accurate enough to rank,
                compare and explain — but they are not the official numbers, and some are a year or two
                behind. County figures are modelled. Before anything leaves this screen for a report, a
                filing or a board deck, replace the dataset with a pull from the sources listed below.
              </p>
            </div>

            <div className="wide">
              <Panel title="Units and what they mean">
                <dl style={{ margin: 0, font: `400 12.5px/1.7 ${SANS}`, color: T.dim }}>
                  {[
                    ["Trillion Btu (TBtu)", "Total energy across all fuels — gasoline, gas, coal, electricity losses and all. The only unit that lets you add a refinery to a household."],
                    ["Terawatt-hour (TWh)", "Electricity only. One TWh is a billion kWh."],
                    ["MMBtu per person", "Consumption divided by residents. High values usually signal heavy industry, not wasteful households."],
                    ["Net generation", "What power plants actually put onto the grid, after station service."],
                    ["Retail sales", "What utilities billed to end customers in the state."],
                    ["Net position", "Net generation minus retail sales. Positive means the state exports on balance across the year."],
                    ["Self-sufficiency", "Primary energy produced divided by energy consumed."],
                  ].map(([t, d]) => (
                    <div key={t} style={{ padding: "9px 0", borderBottom: `1px solid ${T.line}` }}>
                      <dt style={{ font: `500 11.5px ${MONO}`, color: T.text, letterSpacing: "0.04em" }}>{t}</dt>
                      <dd style={{ margin: "3px 0 0" }}>{d}</dd>
                    </div>
                  ))}
                </dl>
              </Panel>

              <Panel title="How the county model works">
                <ol style={{ margin: 0, paddingLeft: 18, font: `400 12.5px/1.75 ${SANS}`, color: T.dim }}>
                  <li>Start from the state's reported consumption, split across the four end-use sectors.</li>
                  <li>Take the largest counties by population; roll everything else into <em>Balance of state</em>.</li>
                  <li>Apportion residential, industrial and transportation demand in direct proportion to population.</li>
                  <li>Apportion commercial demand with a mild tilt toward larger counties, since offices, retail and data centres concentrate in metros. The weight is population × (0.85 + 0.35 × √(pop ÷ largest county pop)), then renormalised.</li>
                  <li>Electricity is apportioned on a 75/25 blend of the flat and tilted weights.</li>
                  <li>Every county in a state sums back to that state's reported total.</li>
                </ol>
                <p style={{ font: `400 12px/1.7 ${SANS}`, color: T.faint, margin: "14px 0 0" }}>
                  What this deliberately does <em>not</em> do: place power plants, refineries, smelters or
                  data centres. A single aluminium smelter or hyperscale campus can swamp a rural county's
                  entire modelled load. Treat any county with known heavy industry as understated, and
                  replace the estimate with metered data where you have it.
                </p>
              </Panel>
            </div>

            <Panel title="Where to get the real numbers">
              <div className="grid-2" style={{ gap: 14 }}>
                {[
                  ["EIA State Energy Data System (SEDS)", "Consumption, production and prices by state and sector, back to 1960. The source series behind every TBtu figure here."],
                  ["EIA Electric Power Annual & Form EIA-923", "Net generation and fuel consumption by plant, so you can aggregate to any geography you like — including counties."],
                  ["EIA Form EIA-861", "Retail sales, revenue, customer counts and average prices by utility and state."],
                  ["EIA Form EIA-860", "Generator-level capacity, fuel, status and location — the file to join against for real county-level supply."],
                  ["EIA Hourly Electric Grid Monitor", "Actual hourly demand, generation and interchange by balancing authority. This is where annual net positions turn into real import/export patterns."],
                  ["EIA Open Data API v2", "Programmatic access to all of the above. Free key, JSON responses, one endpoint per series."],
                ].map(([t, d]) => (
                  <div key={t} style={{ border: `1px solid ${T.line}`, borderRadius: 2, padding: "11px 13px", background: T.panel2 }}>
                    <div style={{ font: `500 12px ${MONO}`, color: T.text, marginBottom: 5 }}>{t}</div>
                    <div style={{ font: `400 11.5px/1.6 ${SANS}`, color: T.faint }}>{d}</div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Known limits of this build">
              <ul style={{ margin: 0, paddingLeft: 18, font: `400 12.5px/1.8 ${SANS}`, color: T.dim }}>
                <li>Annual resolution only. Nothing here shows a load curve, a peak hour, or a scarcity event — and those are where grid stress actually lives.</li>
                <li>Net position is an annual balance, not a measure of interchange. States trade power in both directions every hour.</li>
                <li>Generation is assigned to the state where the plant sits, not to whoever contracted the output.</li>
                <li>Distributed rooftop solar is only partly captured; states with large behind-the-meter fleets will look lower on solar than they are.</li>
                <li>Consumption is 2022-vintage, generation and prices are 2023-vintage, population is 2023. Ratios that mix the two carry that seam.</li>
                <li>The trend chart is national only. State-level history is not in this dataset.</li>
              </ul>
            </Panel>
          </div>
        )}
      </main>

      <footer style={{
        borderTop: `1px solid ${T.line}`, padding: "16px 18px", marginTop: 8,
      }}>
        <div style={{
          maxWidth: 1500, margin: "0 auto", display: "flex", gap: 14,
          justifyContent: "space-between", flexWrap: "wrap",
          font: `400 10.5px ${MONO}`, color: T.faint, letterSpacing: "0.06em",
        }}>
          <span>EMBEDDED REFERENCE DATASET · CONSUMPTION 2022 · GENERATION &amp; PRICES 2023 · POPULATION 2023</span>
          <span>COUNTY FIGURES ARE MODELLED ESTIMATES — SEE METHOD</span>
        </div>
      </footer>
    </div>
  );
}
