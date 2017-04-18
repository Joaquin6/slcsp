var fs = require('fs'),
	path = require('path'),
	parse = require('csv-parse/lib/sync'),
	colors = require('./libs/colors');

var zipCodes, healthPlans, slcsps, output;

function commense() {
	/** Load and Read the CSV Data */
	loadCSVData()
		.then(calculateSLCSP)
		.then(function(data) {
			console.log('DONE');
			process.exit();
		})
		.catch(function(err) {
			console.log('Something Went Wrong');
			process.exit(1);
		});
}

function loadCSVData() {
	console.log("\nLoading Data");
	/** get and filter the services zones, only need a few of them */
	return readFile('slcsp')
		.then(function(slcspRaw) {
			slcsps = parse(slcspRaw, {columns:true});
			console.log('============ ' + colors.green('SLCSP') + ' ==============\n');
			console.log(slcsps[0]);
			console.log('============ ' + colors.green('SLCSP') + ' ==============\n');
			return readFile('plans');
		})
		.then(function(plansRaw) {
			healthPlans = parse(plansRaw, {columns:true});
			console.log('============ ' + colors.green('PLANS') + ' ==============\n');
			console.log(healthPlans[0]);
			console.log('============ ' + colors.green('PLANS') + ' ==============\n');
			return readFile('zips');
		})
		.then(function(zipCodesRaw) {
			zipCodes = parse(zipCodesRaw, {columns:true});
			console.log('============ ' + colors.green('ZIPS') + ' ==============\n');
			console.log(zipCodes[0]);
			console.log('============ ' + colors.green('ZIPS') + ' ==============\n');
		});
}

function readFile(file) {
	return new Promise(function(resolve, reject) {
		fs.readFile(path.resolve(__dirname, 'data', file + '.csv'), function(err, data) {
			if (err)
				return reject(err);
			resolve(data);
		});
	});
}

function calculateSLCSP() {
	console.log("\nCalculating SLCSP Per Zipcode");
	/** So what do we need.. calculate SLCSP per zipcode location */
	return new Promise(function(resolve, reject) {
		var promises = slcsps.map(function(slcsp) {
			findZipCode(slcsp.zipcode)
				.then(function(res) {
					console.log('Found %s Zipcodes for %s', colors.green(res.total), colors.green(res.zipcode));
				})
			return slcsp;
		});
		return Promise.all(promises).then(resolve, reject);
	});
}

function findZipCode(zipcode) {
	return new Promise(function(resolve) {
		var i = 0, res = {}, zips = [];
		res.zipcode = zipcode;
		while (i < zipCodes.length) {
			if (zipcode === zipCodes[i].zipcode)
				zips.push(zipCodes[i]);
			i++;
		}
		res.found = zips;
		res.total = zips.length;
		resolve(res);
	});
}

/** Starting Point */
commense();