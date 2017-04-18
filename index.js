var fs = require('fs'),
	path = require('path'),
	eol = require('os').EOL,
	colors = require('./libs/colors');

var zipCodes, healthPlans, slcsps;

var Utility = {
	findZipCode: function(zipcode) {
		var i = 0,
			zc;
		var res = {
			zip: zipcode,
			found: [],
			total: 0
		};

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
	findRateArea: function(zc) {
		var x = 0,
			fzc,
			res = {
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
				var existingRA = res.found.filter(function(ra) {
					return fzc.rate_area === ra.rate_area;
				});

				if (!existingRA.length) {
					res.count++;
					res.found.push(fzc);
					res.hintCount++;
					res.hint.push(fzc.rate_area);
				}
			}

			x++;
		}

		var hint = '';
		res.hint.map(function(ra, i, arr) {
			if (!hint.length)
				hint += ra;
			else if ((i + 1) === arr.length)
				hint += ' and ' + ra;
			else
				hint += ', ' + ra;
		});
		res.hint = hint;

		return res;
	},
	findHealthPlan: function(metal, state, rate_area) {
		if (!metal || !state || !rate_area)
			return false;

		var hpdata = healthPlans.filter(function(elem, idx, arr) {
			return elem.metal_level === metal;
		});

		hpdata.filter(function(elem, idx, arr) {
			return elem.state === state;
		});

		hpdata.filter(function(elem, idx, arr) {
			return elem.rate_area === rate_area;
		});

		hpdata.sort(function(a, b) {
			return a.rate - b.rate;
		});

		hpdata.slice(1, 2);

		if (hpdata)
			return hpdata[0];
		return false;
	},
	getZipData: function(zipcode) {
		var res = {
			ra: null,
			zc: this.findZipCode(zipcode)
		};
		res.ra = this.findRateArea(res.zc);
		return res;
	},
	parseDataFile: function(file) {
		/** @type {String} Read the contents of the data file */
		var data = fs.readFileSync(path.resolve(__dirname, 'data', file + '.csv'), 'utf8');

		/** Now parse the data */
		var results = [];
		var records = data.split(eol);
		var headers = records[0].split(",");

		records.shift();
		records.map(function(record) {
			var recObj = {};
			var columns = record.split(",");
			columns.map(function(value, idx) {
				recObj[headers[idx]] = columns[idx];
			});
			results.push(recObj);
		});

		return results;
	}
};

function commense() {
	/** Load and Read the CSV Data */
	loadCSVData();
	/** Calculate SLCSP per Zipcode */
	calculateSLCSP();
	/** Write Results to `output.csv` */
	generateOutput();
}

function loadCSVData() {
	console.log("\nLoading Data\n");
	slcsps = Utility.parseDataFile('slcsp');
	healthPlans = Utility.parseDataFile('plans');
	zipCodes = Utility.parseDataFile('zips');
}

function calculateSLCSP() {
	console.log("\nCalculating SLCSP Per Zipcode");
	var counter = {
		bad: 0,
		good: 0,
		total: 0
	};
	slcsps.map(function(slcsp, i, arr) {
		var data = Utility.getZipData(slcsp.zipcode);

		/** If zipcode is located in multiple rate areas, the answer is ambiguous */
		if (data.ra.count > 1) {
			counter.bad++;
			console.log('\n\t%s', colors.red('No SLCSP Found'));
			console.log('\tReason: Zipcode %s was Located in %s Different Rate Areas', colors.red.bold(data.ra.zip), colors.red.bold(data.ra.count));
			console.log('\tHint: Different Rate Areas were %s\n', colors.red(data.ra.hint));
		} else {
			counter.good++;
			var sra = data.ra.found[0];
			var hp = Utility.findHealthPlan('Silver', sra.state, sra.rate_area);
			slcsp.rate = hp.rate;
		}
		counter.total++;

		return slcsp;
	});

	console.log('\tGroup Total: %s', colors.cyan.underline(counter.total));
	console.log('\tSLCSP Rates:');
	console.log('\t\tSuccessful: %s', colors.green(counter.good));
	console.log('\t\tFailed: %s', colors.red(counter.bad));
}

function generateOutput() {
	console.log('\nGenerating Output');
	var headers = Object.keys(slcsps[0]);
	var records = slcsps.map(function(slcsp) {
		return headers.map(function(column) {
			return slcsp[column];
		}).join(",");
	}).join(eol);

	records = headers.join(",") + eol + records;
	fs.writeFileSync(path.resolve(__dirname, 'output.csv'), records, 'utf8');
	console.log('\n\tOutput CSV File: %s\n', colors.green('output.csv'));
}

/** Starting Point */
commense();