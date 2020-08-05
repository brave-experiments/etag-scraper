const urlLib = require('url')

const randomJsLib = require('random-js')
const tldJsLib = require('tldjs')

const _onResponse = async (collection, logger, response) => {
  const request = response.request()
  const requestMethod = request.method()
  const requestUrl = request.url()
  logger.write(`Received response to: ${requestMethod} - ${requestUrl}\n`)

  const requestType = request.resourceType()

  const responseHeaders = response.headers()
  const responseEtag = responseHeaders.etag || null
  const responseStatus = response.status()

  const frame = await response.frame()
  const frameUrl = frame ? frame.url() : undefined

  let size
  try {
    size = (await response.buffer()).length
  } catch (e) {
    size = -1
    logger.write(`Caught error for request: ${requestUrl}\n`)
    logger.write(String(e) + '\n')
  }

  collection.push({
    method: requestMethod,
    requestUrl: requestUrl,
    type: requestType,
    etag: responseEtag,
    frameUrl: frameUrl,
    size: size,
    status: responseStatus,
    timestamp: Date.now()
  })
}

const _getSameSiteLinks = async (logger, page, count = 1) => {
  let links
  try {
    links = await page.$$('a[href]')
  } catch (e) {
    logger.write(`Unable to look for child links, page closed: ${e.toString()}\n`)
    return []
  }

  const sameETldLinks = new Set()
  const pageUrl = page.url()
  const mainETld = tldJsLib.getDomain(pageUrl)

  for (const aLink of links) {
    const hrefHandle = await aLink.getProperty('href')
    const hrefValue = await hrefHandle.jsonValue()
    try {
      const hrefUrl = new urlLib.URL(hrefValue.trim(), pageUrl)
      hrefUrl.hash = ''
      hrefUrl.search = ''

      if (hrefUrl.protocol !== 'http:' && hrefUrl.protocol !== 'https:') {
        continue
      }

      const childUrlString = hrefUrl.toString()
      const childLinkETld = tldJsLib.getDomain(childUrlString)
      if (childLinkETld !== mainETld) {
        continue
      }
      if (!childUrlString || childUrlString.length === 0) {
        continue
      }
      sameETldLinks.add(childUrlString)
    } catch (_) {
      continue
    }
  }

  const uniqueChildUrls = Array.from(sameETldLinks)
  if (uniqueChildUrls.length <= count) {
    return uniqueChildUrls
  }

  const random = new randomJsLib.Random()
  return random.sample(uniqueChildUrls, count)
}

const measurePage = async (settings, page, url, currentDepth = 0) => {
  const { output, log, secs, depth } = settings

  const requests = []
  const boundOnRequest = _onResponse.bind(undefined, requests, log)
  page.on('response', boundOnRequest)

  let wasMeasurementSuccessful = false
  try {
    await page.goto(url)
    await page.waitFor(secs * 1000)
    wasMeasurementSuccessful = true
  } catch (e) {
    log.write(`Puppeteer exception caught: ${e}\n`)
  }

  page.removeListener('response', boundOnRequest)
  if (wasMeasurementSuccessful === false) {
    return
  }

  output.write(JSON.stringify({
    url,
    requests
  }) + '\n')

  if (currentDepth === depth) {
    log.write(`Done measuring, currentDepth === desired depth: ${depth}.\n`)
    return
  }

  const sameSitePage = await _getSameSiteLinks(log, page, 1)
  if (sameSitePage.length === 0) {
    log.write('Done measuring, could not find any same site links\n.')
    return
  }

  const sameSiteLink = sameSitePage[0]
  const newDepth = currentDepth + 1
  log.write(`${newDepth}/${depth}: Measuring child page ${sameSiteLink}.\n`)
  await measurePage(settings, page, sameSiteLink, newDepth)
}

module.exports = {
  measurePage
}
