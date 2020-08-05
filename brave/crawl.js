const fsLib = require('fs')

const puppeteerLib = require('puppeteer-extra')
const stealthPluginLib = require('puppeteer-extra-plugin-stealth')
const validatorLib = require('validator')

const browserLib = require('./browser')

const run = async settings => {
  const { url, verbose } = settings

  const puppeteerArgs = {
    headless: !verbose
  }

  puppeteerLib.use(stealthPluginLib())
  const browser = await puppeteerLib.launch(puppeteerArgs)
  const page = await browser.newPage()

  await browserLib.measurePage(settings, page, url)
  await browser.close()
}

const argsToSettings = async cliArgs => {
  const settings = {
    url: undefined,
    output: undefined,
    log: undefined,
    verbose: false,
    secs: undefined,
    depth: undefined
  }

  const urlArgs = {
    protocols: ['http', 'https'],
    require_protocol: true
  }
  if (validatorLib.isURL(cliArgs.url, urlArgs) === false) {
    return [false, `Invalid URL provided: ${cliArgs.url}`]
  }
  settings.url = cliArgs.url

  if (cliArgs.output === null) {
    settings.output = process.stdout
  } else {
    settings.output = await fsLib.promises.open(cliArgs.output, 'a')
  }

  if (cliArgs.verbose === true) {
    settings.log = process.stdout
    settings.verbose = true
  } else {
    settings.log = {
      write: _ => {}
    }
  }

  if (cliArgs.seconds <= 0) {
    return [false, `Cannot have a negative dwell time, got ${cliArgs.seconds}`]
  }
  settings.secs = cliArgs.seconds

  if (cliArgs.depth < 0) {
    return [false, `Cannot specify a negative depth, got ${cliArgs.depth}`]
  }
  settings.depth = cliArgs.depth

  return [true, settings]
}

module.exports = {
  argsToSettings,
  run
}
