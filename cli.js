#!/usr/bin/env node
const argParseLib = require('argparse')

const crawlLib = require('./brave/crawl')

const parser = new argParseLib.ArgumentParser({
  addHelp: true,
  description: 'Record eTag information when visiting a website.'
})
parser.addArgument(['-u', '--url'], {
  help: 'The URL of the page to measure.',
  required: true
})
parser.addArgument(['-o', '--output'], {
  help: 'Path to write results to.  If a file exists at the path, results ' +
    'will be appended to the file.  If not provided, will write to STDOUT.'
})
parser.addArgument(['-v', '--verbose'], {
  help: 'If provided, print debugging information to STDOUT.',
  action: 'storeTrue'
})
parser.addArgument(['-s', '--seconds'], {
  type: 'int',
  help: 'How long to let each page load during measurement.',
  defaultValue: 30
})
const cliArgs = parser.parseArgs();

(async _ => {
  const [isSuccess, settings] = await crawlLib.argsToSettings(cliArgs)
  if (isSuccess === false) {
    throw settings
  }

  await crawlLib.run(settings)
})()
