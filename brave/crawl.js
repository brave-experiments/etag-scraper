const fsLib = require('fs')

const puppeteerLib = require('puppeteer-extra')
const stealthPluginLib = require('puppeteer-extra-plugin-stealth')
const validatorLib = require('validator')

const browserLib = require('./browser')

const run = async settings => {
  const { url, output, log, verbose, secs } = settings

  const puppeteerArgs = {
    headless: !verbose
  }

  const requests = []
  const boundOnRequest = browserLib.onResponse.bind(undefined, requests, log)

  puppeteerLib.use(stealthPluginLib())
  const browser = await puppeteerLib.launch(puppeteerArgs)
  const page = await browser.newPage()
  page.on('response', boundOnRequest)
  try {
    await page.goto(url)
    await page.waitFor(secs * 1000)
  } catch (e) {
    log.write(`Puppeteer exception caught: ${e}\n`)
  }

  await browser.close()

  output.write(JSON.stringify({
    url,
    requests
  }))
}

const argsToSettings = async cliArgs => {
  const settings = {
    url: undefined,
    output: undefined,
    log: undefined,
    verbose: false,
    secs: undefined
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

  if (cliArgs <= 0) {
    return [false, `Cannot have a negative dwell time, got ${cliArgs.seconds}`]
  }
  settings.secs = cliArgs.seconds

  return [true, settings]
}

module.exports = {
  argsToSettings,
  run
}
