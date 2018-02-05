const fs = require('fs');
const path = require('path');
const { EOL } = require('os');
const chalk = require('chalk');
const { has, last, isEmpty } = require('lodash');

module.exports = {
  records: {},

  findZipCode(zipcode) {
    const zipCodes = this.parseDataFile('zips');
    const res = {
      zip: zipcode,
      found: [],
      total: 0
    };

    let i = 0;
    let zc = null;

    while (i < zipCodes.length) {
      if (zipcode === zipCodes[i].zipcode) {
        zc = zipCodes[i];
        res.total++;
        res.found.push(zc);
      }
      i++;
    }

    return res;
  },

  findRateArea(zc) {
    let x = 0;
    let fzc = null;
    const res = {
      count: 0,
      found: [],
      zip: zc.zip,
      hint: [],
      hintCount: 0
    };
    /**
     * A ZIP Code can also be in more than one rate area.
     * In that case, the answer is ambiguous and should be left blank.
     * Therefore, we check each of the zipCodes matches and verify if the
     * zipcode is located in multiple rate areas.
     */
    while (x < zc.total) {
      fzc = zc.found[x];

      if (!res.found.length) {
        res.count++;
        res.found.push(fzc);
        res.hintCount++;
        res.hint.push(fzc.rate_area);
      } else {
        const existingRA = res.found.filter(ra => fzc.rate_area === ra.rate_area);

        if (!existingRA.length) {
          res.count++;
          res.found.push(fzc);
          res.hintCount++;
          res.hint.push(fzc.rate_area);
        }
      }

      x++;
    }

    let hint = '';
    res.hint.map((ra, i, arr) =>
      (!hint.length ? hint += ra :
      (i + 1) === arr.length ? hint += ' and ' + ra : hint += ', ' + ra));

    // res.hint.map((ra, i, arr) => {
    //   if (!hint.length)
    //     hint += ra;
    //   else if ((i + 1) === arr.length)
    //     hint += ' and ' + ra;
    //   else
    //     hint += ', ' + ra;
    // });
    res.hint = hint;

    return res;
  },

  findHealthPlan(metal, state, rate_area) {
    if (!metal || !state || !rate_area)
      return false;

    const plans = this.parseDataFile('plans');
    const hpdata = plans.filter(elem => elem.metal_level === metal);

    hpdata.filter(elem => elem.state === state);

    hpdata.filter(elem => elem.rate_area === rate_area);

    hpdata.sort((a, b) => a.rate - b.rate);

    hpdata.slice(1, 2);

    if (hpdata)
      return hpdata[0];
    return false;
  },

  generateOutput(outputFile, slcsps) {
    console.log('\n\tGenerating Output');

    const pathToFile = path.resolve(__dirname, '..', outputFile);
    const headers = Object.keys(slcsps[0]);

    let records = slcsps.map(slcsp =>
      headers.map(column =>
        slcsp[column]).join(',')).join(EOL);
    records = headers.join(',') + EOL + records;

    fs.writeFileSync(pathToFile, records, 'utf8');

    console.log(`\n\t\tOutput CSV File: ${chalk.green(outputFile)}\n`);
  },

  getZipData(zipcode) {
    const zc = this.findZipCode(zipcode);
    const ra = this.findRateArea(zc);
    return { ra, zc };
  },

  parseDataFile(file) {
    if (has(this.records, file))
      return this.records[file];

    /** @type {String} Read the contents of the data file */
    const pathToFile = path.resolve(__dirname, '..', `data/${file}.csv`);
    const data = fs.readFileSync(pathToFile, 'utf8');

    /** Now parse the data */
    const results = [];
    const records = data.split(EOL);
    const headers = records[0].split(",");

    /** If last record is an empty line. remove from data set */
    if (isEmpty(last(records))) records.pop();

    records.shift();
    records.map(record => {
      const recObj = {};
      const columns = record.split(",");
      columns.map((value, idx) => recObj[headers[idx]] = columns[idx]);
      results.push(recObj);
    });

    this.records[file] = results;
    return results;
  }
};

