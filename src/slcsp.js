const chalk = require('chalk');
const Utility = require('./utility');


/**
 * Calculate SLCSP per Zipcode
 */
const slcsps = Utility.parseDataFile('slcsp');
const counter = { bad: 0, good: 0, total: 0 };

console.log("\n\tCalculating SLCSP Per Zipcode");
slcsps.map((slcsp, i, arr) => {
  const { ra } = Utility.getZipData(slcsp.zipcode);
  /** If zipcode is located in multiple rate areas, the answer is ambiguous */
  if (ra.count > 1) {
    counter.bad++;
    let logMsg = `\n\t\t${chalk.red('No SLCSP Found')}`;
    logMsg += `\n\t\tReason: Zipcode ${chalk.red.bold(ra.zip)} was Located`;
    logMsg += ` in ${chalk.red.bold(ra.count)} Different Rate Areas`;
    logMsg += `\n\t\tHint: Different Rate Areas were ${chalk.red(ra.hint)}\n`;
    console.log(logMsg);
  } else {
    counter.good++;
    const { state, rate_area } = ra.found[0];
    const { rate } = Utility.findHealthPlan('Silver', state, rate_area);
    slcsp.rate = rate;
  }
  counter.total++;
  return slcsp;
});
console.log(`\tGroup Total: ${chalk.cyan.underline(counter.total)}`);
console.log('\tSLCSP Rates:');
console.log(`\t\tSuccessful: ${chalk.green(counter.good)}`);
console.log(`\t\tFailed: ${chalk.red(counter.bad)}`);

/**
 * Write Results to `output.csv`
 */
Utility.generateOutput('output.csv', slcsps);
